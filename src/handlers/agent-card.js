export function handleAgentCard(request) {
  const origin = new URL(request.url).origin;

  const card = {
    name: 'Oh My Share',
    version: '2.1.0',
    description: 'HTML and code sharing with end-to-end encryption. Upload, manage, and share HTML files and code snippets.',
    url: origin,
    provider: {
      organization: 'Oh My Share',
      url: origin,
    },
    documentationUrl: origin,
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false,
    },
    authentication: {
      schemes: ['cookie'],
    },
    defaultInputModes: ['text'],
    defaultOutputModes: ['text', 'file'],
    supportsAuthenticatedExtendedCard: false,
    skills: [
      {
        id: 'upload-html',
        name: 'Upload HTML',
        description: 'Upload HTML files and code snippets for sharing',
        tags: ['upload', 'html', 'share'],
        examples: ['Upload a React component', 'Share a CSS layout'],
      },
      {
        id: 'manage-assets',
        name: 'Manage Assets',
        description: 'List, view, and manage uploaded assets',
        tags: ['manage', 'list', 'assets'],
        examples: ['List my uploads', 'Delete an old share'],
      },
      {
        id: 'view-content',
        name: 'View Content',
        description: 'View shared HTML content and code snippets',
        tags: ['view', 'read', 'content'],
        examples: ['View a shared page', 'Read code snippet'],
      },
      {
        id: 'encrypted-share',
        name: 'Encrypted Sharing',
        description: 'Share content with password protection and expiration',
        tags: ['encrypt', 'password', 'expire'],
        examples: ['Share with password', 'Set expiration time'],
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
