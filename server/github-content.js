const { emptyContent, normalizeContent } = require('./content-schema');

const CONTENT_PATH = 'content/site-content.json';

function configuration() {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_CONTENT_TOKEN;
  const branch = process.env.GITHUB_CONTENT_BRANCH || 'main';
  if (!repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw Object.assign(new Error('Missing server configuration: GITHUB_REPOSITORY'), { statusCode: 500 });
  }
  if (!token) throw Object.assign(new Error('Missing server configuration: GITHUB_CONTENT_TOKEN'), { statusCode: 500 });
  return { repository, token, branch };
}

async function githubRequest(path, options = {}) {
  const { repository, token } = configuration();
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'starpower-content-editor',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const statusCode = response.status === 409 || response.status === 422 ? 409 : response.status >= 500 ? 502 : 500;
    throw Object.assign(new Error(statusCode === 409 ? 'The website changed while publishing. Reload the editor and try again.' : 'GitHub could not publish the website update.'), { statusCode, githubStatus: response.status });
  }
  return payload;
}

async function branchState() {
  const { branch } = configuration();
  const reference = await githubRequest(`/git/ref/heads/${encodeURIComponent(branch)}`);
  const commit = await githubRequest(`/git/commits/${reference.object.sha}`);
  return { commitSha: reference.object.sha, treeSha: commit.tree.sha };
}

async function loadContent(commitSha) {
  const { branch } = configuration();
  const reference = commitSha || branch;
  try {
    const file = await githubRequest(`/contents/${CONTENT_PATH}?ref=${encodeURIComponent(reference)}`);
    return normalizeContent(JSON.parse(Buffer.from(file.content.replace(/\s/g, ''), 'base64').toString('utf8')));
  } catch (error) {
    if (error.githubStatus === 404) return emptyContent();
    throw error;
  }
}

async function createBlob(content, encoding) {
  return githubRequest('/git/blobs', {
    method: 'POST',
    body: JSON.stringify({ content, encoding }),
  });
}

async function publishContent(nextContent, commitMessage, image) {
  const { branch } = configuration();
  const state = await branchState();
  const contentBlob = await createBlob(`${JSON.stringify(nextContent, null, 2)}\n`, 'utf-8');
  const entries = [{ path: CONTENT_PATH, mode: '100644', type: 'blob', sha: contentBlob.sha }];
  if (image) {
    const imageBlob = await createBlob(image.base64, 'base64');
    entries.push({ path: image.path, mode: '100644', type: 'blob', sha: imageBlob.sha });
  }
  const tree = await githubRequest('/git/trees', {
    method: 'POST',
    body: JSON.stringify({ base_tree: state.treeSha, tree: entries }),
  });
  const commit = await githubRequest('/git/commits', {
    method: 'POST',
    body: JSON.stringify({ message: commitMessage, tree: tree.sha, parents: [state.commitSha] }),
  });
  await githubRequest(`/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  return commit.sha;
}

module.exports = { loadContent, publishContent };
