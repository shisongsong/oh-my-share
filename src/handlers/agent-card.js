export function handleAgentCard(request) {
  const origin = new URL(request.url).origin;
  const a2aUrl = `${origin}/a2a`;

  const card = {
    name: 'Oh My Share',
    description:
      'HTML and code sharing with end-to-end encryption. Publish HTML via SendMessage, search the public gallery, and get share links back.',
    version: '2.2.0',
    supportedInterfaces: [
      {
        url: a2aUrl,
        protocolBinding: 'JSONRPC',
        protocolVersion: '1.0',
      },
    ],
    // Legacy (pre-v1.0) clients read top-level url/preferredTransport
    url: a2aUrl,
    preferredTransport: 'JSONRPC',
    provider: {
      organization: 'Oh My Share',
      url: origin,
    },
    documentationUrl: `${origin}/auth.md`,
    iconUrl: `${origin}/icon.svg`,
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false,
      extendedAgentCard: false,
    },
    defaultInputModes: ['text/plain', 'text/html'],
    defaultOutputModes: ['text/plain'],
    skills: [
      {
        id: 'publish-html',
        name: 'Publish HTML',
        description:
          'Upload HTML or code sent in a message and return a shareable link (plus a private edit link)',
        tags: ['upload', 'publish', 'html', 'share'],
        examples: [
          'publish <html><body><h1>Hello</h1></body></html>',
          '<!DOCTYPE html><html><body>My page</body></html>',
        ],
      },
      {
        id: 'search-gallery',
        name: 'Search Gallery',
        description: 'Search published works in the public gallery by keyword',
        tags: ['search', 'gallery', 'discover'],
        examples: ['search animation', 'search dashboard'],
      },
      {
        id: 'get-info',
        name: 'Service Info',
        description: 'Learn how to publish and share via Oh My Share',
        tags: ['info', 'help'],
        examples: ['help'],
      },
      {
        id: 'encrypted-share',
        name: 'Encrypted Sharing',
        description: 'Share content with password protection and expiration via the web app or MCP',
        tags: ['encrypt', 'password', 'expire'],
        examples: ['Share with password protection'],
      },
    ],
  };

  return new Response(JSON.stringify(card), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
