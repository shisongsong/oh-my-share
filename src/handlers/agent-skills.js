import { sha256 } from '../crypto.js';

const SKILLS = [
  {
    name: 'upload',
    type: 'skill-md',
    description: 'Upload HTML files and code snippets for sharing',
    path: '/skills/upload.md',
  },
  {
    name: 'manage',
    type: 'skill-md',
    description: 'List, view, and manage uploaded assets',
    path: '/skills/manage.md',
  },
  {
    name: 'view',
    type: 'skill-md',
    description: 'View shared HTML content and code snippets',
    path: '/skills/view.md',
  },
  {
    name: 'encrypt',
    type: 'skill-md',
    description: 'Share content with password protection and expiration',
    path: '/skills/encrypt.md',
  },
];

export async function handleAgentSkillsIndex(request, env) {
  const origin = new URL(request.url).origin;

  const skills = [];
  for (const skill of SKILLS) {
    const url = `${origin}${skill.path}`;
    let digest = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';

    try {
      const asset = await env.MY_BUCKET.get(`skills/${skill.name}.md`);
      if (asset) {
        const body = await asset.text();
        const hashBytes = await sha256(body);
        const hashHex = Array.from(new Uint8Array(hashBytes))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        digest = `sha256:${hashHex}`;
      }
    } catch {
      // fallback to zero digest
    }

    skills.push({
      name: skill.name,
      type: skill.type,
      description: skill.description,
      url,
      digest,
    });
  }

  const index = {
    $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
    version: '0.2.0',
    skills,
  };

  return new Response(JSON.stringify(index), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
