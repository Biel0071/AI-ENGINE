const GITHUB_REPOSITORY_RE = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)\/?$/i;

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseGitHubRepository(url) {
  const match = String(url || '').trim().match(GITHUB_REPOSITORY_RE);
  if (!match) {
    throw new Error('repository.url must be a canonical GitHub repository URL');
  }

  return {
    provider: 'github',
    owner: match[1],
    name: match[2].replace(/\.git$/i, ''),
    url: `https://github.com/${match[1]}/${match[2].replace(/\.git$/i, '')}`,
  };
}

function createProject(input, tenantId) {
  if (!tenantId) throw new Error('tenantId is required');
  if (!input || !input.name) throw new Error('project.name is required');

  const repository = parseGitHubRepository(input.repository && input.repository.url);
  const id = slugify(input.id || repository.name || input.name);
  if (!id) throw new Error('project.id could not be generated');

  return {
    id,
    tenantId,
    name: String(input.name).trim(),
    description: String(input.description || '').trim(),
    repository: {
      ...repository,
      visibility: input.repository.visibility === 'private' ? 'private' : 'public',
    },
    primaryLanguage: input.primaryLanguage || null,
    lifecycle: input.lifecycle || 'connected',
    analysisStatus: 'pending',
    deploymentStatus: 'not-configured',
    tags: Array.isArray(input.tags) ? [...new Set(input.tags.map(slugify).filter(Boolean))] : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

module.exports = { createProject, parseGitHubRepository, slugify };
