let cachedKeyPair = null;

async function getKeyPair() {
  if (cachedKeyPair) return cachedKeyPair;

  cachedKeyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  return cachedKeyPair;
}

export async function handleHttpMessageSignaturesDirectory(request) {
  const keyPair = await getKeyPair();
  const publicKey = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

  const jwks = {
    keys: [
      {
        ...publicKey,
        kid: 'oh-my-share-bot-key-1',
        use: 'sig',
        alg: 'RS256',
      },
    ],
  };

  return new Response(JSON.stringify(jwks), {
    status: 200,
    headers: {
      'Content-Type': 'application/jwk-set+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
