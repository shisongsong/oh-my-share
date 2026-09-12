import { describe, expect, it } from 'vitest';
import { handleRegister, handleCurrentUser, handleLogin, handleLogout } from '../src/handlers/auth.js';
import { handleDeleteAsset, handleListAssets } from '../src/handlers/assets.js';
import { handleUpload } from '../src/handlers/upload.js';
import { handleView } from '../src/handlers/view.js';
import { parseEncryptionMetadata } from '../src/encryption.js';

class MemoryDatabase {
  constructor() {
    this.rateCounts = new Map();
    this.users = new Map();
    this.sessions = new Map();
    this.subscriptions = new Map();
    this.files = new Map();
  }

  prepare(query) {
    return {
      bind: (...values) => ({
        first: async () => this.first(query, values),
        all: async () => this.all(query, values),
        run: async () => this.run(query, values),
      }),
    };
  }

  async first(query, values) {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('rate_limits')) {
      const key = values[0];
      const count = (this.rateCounts.get(key) || 0) + 1;
      this.rateCounts.set(key, count);
      return { count };
    }
    if (lowerQuery.includes('from users') && lowerQuery.includes('where email')) {
      return [...this.users.values()].find((user) => user.email === values[0]) || null;
    }
    if (lowerQuery.includes('from sessions') && lowerQuery.includes('inner join users')) {
      const session = this.sessions.get(values[0]);
      if (!session || session.expires_at <= values[1]) return null;
      const user = this.users.get(session.user_id);
      return user ? { id: user.id, email: user.email, created_at: user.created_at } : null;
    }
    if (lowerQuery.includes('from subscriptions')) {
      return this.subscriptions.get(values[0]) || null;
    }
    if (lowerQuery.includes('select id from files where id = ? and owner_id = ?')) {
      const file = this.files.get(values[0]);
      return file?.owner_id === values[1] ? { id: file.id } : null;
    }
    if (lowerQuery.includes('select id from files where id = ?')) {
      const file = this.files.get(values[0]);
      return file ? { id: file.id } : null;
    }
    if (lowerQuery.includes('from files') && lowerQuery.includes('where id = ?')) {
      return this.files.get(values[0]) || null;
    }
    return null;
  }

  async all(query, values) {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('from files') && lowerQuery.includes('where owner_id = ?')) {
      return {
        results: [...this.files.values()].filter((file) => file.owner_id === values[0]),
      };
    }
    return { results: [] };
  }

  async run(query, values) {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('insert into users')) {
      this.users.set(values[0], {
        id: values[0],
        email: values[1],
        password_hash: values[2],
        password_salt: values[3],
        created_at: values[4],
      });
    } else if (lowerQuery.includes('insert into sessions')) {
      this.sessions.set(values[0], {
        token_hash: values[0],
        user_id: values[1],
        created_at: values[2],
        expires_at: values[3],
      });
    } else if (lowerQuery.includes('delete from sessions')) {
      this.sessions.delete(values[0]);
    } else if (lowerQuery.includes('insert into files')) {
      this.files.set(values[0], {
        id: values[0],
        filename: values[1],
        owner_id: values[2],
        encrypted: values[3],
        encryption_version: values[4],
        encryption_metadata: values[5],
        created_at: values[6],
      });
    } else if (lowerQuery.includes('delete from files')) {
      this.files.delete(values[0]);
    }
    return { success: true, meta: { changes: 1 } };
  }
}

function createEnvironment() {
  const database = new MemoryDatabase();
  const objects = new Map();
  const bucket = {
    async put(key, value) {
      objects.set(key, value);
    },
    async get(key) {
      const value = objects.get(key);
      if (value === undefined) return null;
      return { body: value instanceof ReadableStream ? value : new Response(value).body };
    },
    async delete(key) {
      objects.delete(key);
    },
  };
  return { DB: database, MY_BUCKET: bucket, objects };
}

async function register(env, email) {
  const response = await handleRegister(
    new Request('https://example.com/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'correct horse battery staple' }),
    }),
    env
  );
  const data = await response.json();
  return {
    user: data.user,
    cookie: response.headers.get('set-cookie').split(';', 1)[0],
  };
}

const randomMetadata = {
  version: 1,
  algorithm: 'AES-GCM',
  keyMode: 'random',
  iv: 'AAAAAAAAAAAAAAAA',
};

describe('accounts, assets, and encrypted uploads', () => {
  it('registers users, authenticates sessions, and reports server-side entitlements', async () => {
    const env = createEnvironment();
    const account = await register(env, 'Person@Example.com');

    expect(account.user.email).toBe('person@example.com');
    expect(env.DB.users.get(account.user.id).password_hash).not.toContain('correct horse');

    let response = await handleCurrentUser(
      new Request('https://example.com/api/auth/me', { headers: { Cookie: account.cookie } }),
      env
    );
    expect(await response.json()).toMatchObject({
      user: { id: account.user.id, email: 'person@example.com' },
      plan: 'free',
      canEncrypt: false,
    });

    env.DB.subscriptions.set(account.user.id, {
      plan: 'pro',
      status: 'active',
      current_period_end: null,
    });
    response = await handleCurrentUser(
      new Request('https://example.com/api/auth/me', { headers: { Cookie: account.cookie } }),
      env
    );
    expect((await response.json()).canEncrypt).toBe(true);

    response = await handleLogout(
      new Request('https://example.com/api/auth/logout', {
        method: 'POST',
        headers: { Cookie: account.cookie },
      }),
      env
    );
    expect(response.status).toBe(200);

    response = await handleLogin(
      new Request('https://example.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'person@example.com', password: 'correct horse battery staple' }),
      }),
      env
    );
    expect(response.status).toBe(200);
  });

  it('only lists and deletes assets owned by the current session', async () => {
    const env = createEnvironment();
    const owner = await register(env, 'owner@example.com');
    const other = await register(env, 'other@example.com');
    env.DB.files.set('owner-asset', {
      id: 'owner-asset',
      filename: 'page.html',
      owner_id: owner.user.id,
      encrypted: 0,
      encryption_version: 0,
      encryption_metadata: null,
      created_at: 10,
    });
    env.objects.set('owner-asset', '<h1>private management record</h1>');

    let response = await handleDeleteAsset(
      new Request('https://example.com/api/assets/owner-asset', {
        method: 'DELETE',
        headers: { Cookie: other.cookie },
      }),
      env,
      'owner-asset'
    );
    expect(response.status).toBe(404);
    expect(env.objects.has('owner-asset')).toBe(true);

    response = await handleListAssets(
      new Request('https://example.com/api/assets', { headers: { Cookie: owner.cookie } }),
      env
    );
    expect((await response.json()).assets).toHaveLength(1);

    response = await handleDeleteAsset(
      new Request('https://example.com/api/assets/owner-asset', {
        method: 'DELETE',
        headers: { Cookie: owner.cookie },
      }),
      env,
      'owner-asset'
    );
    expect(response.status).toBe(200);
    expect(env.objects.has('owner-asset')).toBe(false);
  });

  it('stores only approved encryption metadata and never a key', async () => {
    expect(parseEncryptionMetadata({ ...randomMetadata, key: 'must-not-be-stored' })).toBeNull();

    const env = createEnvironment();
    const account = await register(env, 'paid@example.com');
    env.DB.subscriptions.set(account.user.id, {
      plan: 'pro',
      status: 'active',
      current_period_end: null,
    });

    const formData = new FormData();
    formData.set('encrypted', '1');
    formData.set('encryption_metadata', JSON.stringify(randomMetadata));
    formData.set('file', new Blob(['ciphertext']), 'secret.html');
    const response = await handleUpload(
      new Request('https://example.com/api/upload', {
        method: 'POST',
        body: formData,
        headers: { Cookie: account.cookie, 'CF-Connecting-IP': '203.0.113.20' },
      }),
      env
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    const stored = env.DB.files.get(data.id);
    expect(stored.owner_id).toBe(account.user.id);
    expect(stored.encrypted).toBe(1);
    expect(stored.encryption_metadata).not.toMatch(/"key"\s*:/);

    const viewer = await handleView(
      new Request(`https://example.com/view/${data.id}`),
      env
    );
    const viewerHtml = await viewer.text();
    expect(viewer.status).toBe(200);
    expect(viewerHtml).toContain('sandbox=');
    expect(viewerHtml).not.toContain('must-not-be-stored');
  });
});