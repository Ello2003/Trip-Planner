import { AppState, Settings } from '../types';

export function utf8ToBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

export function base64ToUtf8(b64: string): string {
  return decodeURIComponent(escape(atob((b64 || '').replace(/\n/g, ''))));
}

export function githubConfigured(s: Settings): boolean {
  return !!(
    s &&
    s.githubEnabled &&
    s.githubToken?.trim() &&
    s.githubOwner?.trim() &&
    s.githubRepo?.trim() &&
    s.githubPath?.trim()
  );
}

export function cleanGithubSettings(s: Settings): Settings {
  return {
    ...s,
    githubToken: (s.githubToken || '').trim(),
    githubOwner: (s.githubOwner || '').trim(),
    githubRepo: (s.githubRepo || '').trim(),
    githubPath: (s.githubPath || 'data.json').trim().replace(/^\/+/, ''),
    githubBranch: (s.githubBranch || 'main').trim()
  };
}

export function githubApiUrl(s: Settings): string {
  const clean = cleanGithubSettings(s);
  const pathParts = clean.githubPath.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  return `https://api.github.com/repos/${encodeURIComponent(clean.githubOwner)}/${encodeURIComponent(clean.githubRepo)}/contents/${pathParts}`;
}

function getAuthHeader(token: string): string {
  const t = token.trim();
  // Standard Bearer is universally supported on modern GitHub API
  return t.startsWith('github_pat_') || t.startsWith('ghp_') ? `Bearer ${t}` : `token ${t}`;
}

export interface GithubTestResult {
  ok: boolean;
  username?: string;
  repoName?: string;
  repoExists: boolean;
  canWrite: boolean;
  branchExists: boolean;
  fileExists: boolean;
  fileSha?: string | null;
  message: string;
  checks: { name: string; passed: boolean; note: string }[];
}

export async function githubTestConnection(settings: Settings): Promise<GithubTestResult> {
  const s = cleanGithubSettings(settings);
  const checks: { name: string; passed: boolean; note: string }[] = [];

  if (!s.githubToken) {
    return {
      ok: false,
      repoExists: false,
      canWrite: false,
      branchExists: false,
      fileExists: false,
      message: 'Token is missing. Enter a GitHub Personal Access Token (PAT).',
      checks: [{ name: 'Token present', passed: false, note: 'Empty token field' }]
    };
  }

  const authHeader = getAuthHeader(s.githubToken);
  let username = '';

  // 1. Check User identity & Token validity
  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: authHeader, Accept: 'application/vnd.github+json' }
    });
    if (userRes.status === 401) {
      return {
        ok: false,
        repoExists: false,
        canWrite: false,
        branchExists: false,
        fileExists: false,
        message: 'GitHub rejected the token (401 Bad Credentials). Check token spelling or expiry.',
        checks: [{ name: 'Token Authenticated', passed: false, note: '401 Unauthorized' }]
      };
    }
    if (userRes.ok) {
      const userData = await userRes.json();
      username = userData.login || 'Authenticated User';
      checks.push({ name: 'Authentication', passed: true, note: `Authenticated as @${username}` });
    } else {
      checks.push({ name: 'Authentication', passed: true, note: 'Token accepted' });
    }
  } catch (err: any) {
    return {
      ok: false,
      repoExists: false,
      canWrite: false,
      branchExists: false,
      fileExists: false,
      message: `Network error connecting to api.github.com: ${err.message || 'Check internet connectivity'}`,
      checks: [{ name: 'Network Connectivity', passed: false, note: err.message || 'Network error' }]
    };
  }

  // 2. Check Repository existence & Write Permissions
  if (!s.githubOwner || !s.githubRepo) {
    return {
      ok: false,
      username,
      repoExists: false,
      canWrite: false,
      branchExists: false,
      fileExists: false,
      message: 'Repository Owner and Name are required.',
      checks: [...checks, { name: 'Repo Configuration', passed: false, note: 'Owner or Repo missing' }]
    };
  }

  let canWrite = false;
  let repoExists = false;
  try {
    const repoRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(s.githubOwner)}/${encodeURIComponent(s.githubRepo)}`, {
      headers: { Authorization: authHeader, Accept: 'application/vnd.github+json' }
    });

    if (repoRes.status === 404) {
      return {
        ok: false,
        username,
        repoExists: false,
        canWrite: false,
        branchExists: false,
        fileExists: false,
        message: `Repository "${s.githubOwner}/${s.githubRepo}" not found (404). If private, ensure your token has permission to access it.`,
        checks: [...checks, { name: 'Repository Found', passed: false, note: `404 Not Found at ${s.githubOwner}/${s.githubRepo}` }]
      };
    }

    if (repoRes.status === 403) {
      return {
        ok: false,
        username,
        repoExists: false,
        canWrite: false,
        branchExists: false,
        fileExists: false,
        message: `Access denied to "${s.githubOwner}/${s.githubRepo}" (403). For Fine-grained tokens, select this repository in "Repository access" and grant "Contents: Read and write".`,
        checks: [...checks, { name: 'Repository Access', passed: false, note: '403 Forbidden' }]
      };
    }

    if (!repoRes.ok) {
      return {
        ok: false,
        username,
        repoExists: false,
        canWrite: false,
        branchExists: false,
        fileExists: false,
        message: `GitHub returned status ${repoRes.status} for repository ${s.githubOwner}/${s.githubRepo}.`,
        checks: [...checks, { name: 'Repository Query', passed: false, note: `Status ${repoRes.status}` }]
      };
    }

    repoExists = true;
    const repoData = await repoRes.json();
    canWrite = !!(repoData.permissions?.push || repoData.permissions?.admin);
    checks.push({
      name: 'Repository Found',
      passed: true,
      note: `${repoData.full_name} (${repoData.private ? 'Private' : 'Public'})`
    });
    checks.push({
      name: 'Write Permissions',
      passed: canWrite,
      note: canWrite ? 'Write access confirmed (push permission)' : 'Read-only access (no push permission)'
    });
  } catch (err: any) {
    return {
      ok: false,
      username,
      repoExists: false,
      canWrite: false,
      branchExists: false,
      fileExists: false,
      message: `Failed to inspect repository: ${err.message}`,
      checks
    };
  }

  // 3. Check Branch existence
  let branchExists = false;
  const branchName = s.githubBranch || 'main';
  try {
    const branchRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(s.githubOwner)}/${encodeURIComponent(s.githubRepo)}/branches/${encodeURIComponent(branchName)}`,
      { headers: { Authorization: authHeader, Accept: 'application/vnd.github+json' } }
    );
    if (branchRes.ok) {
      branchExists = true;
      checks.push({ name: 'Branch Exists', passed: true, note: `Branch "${branchName}" active` });
    } else if (branchRes.status === 404) {
      checks.push({
        name: 'Branch Exists',
        passed: false,
        note: `Branch "${branchName}" not found. If this repository was just created and is completely empty (0 commits), create an initial commit (e.g. check "Add a README" on GitHub) first.`
      });
    }
  } catch {
    // Non-fatal branch query fallback
  }

  // 4. Check File existence
  let fileExists = false;
  let fileSha: string | null = null;
  try {
    const fileRes = await fetch(`${githubApiUrl(s)}?ref=${encodeURIComponent(branchName)}`, {
      headers: { Authorization: authHeader, Accept: 'application/vnd.github+json' }
    });
    if (fileRes.ok) {
      const fileData = await fileRes.json();
      fileExists = true;
      fileSha = fileData.sha || null;
      checks.push({ name: 'Remote Ledger File', passed: true, note: `Found "${s.githubPath}" (Ready to sync)` });
    } else if (fileRes.status === 404) {
      checks.push({ name: 'Remote Ledger File', passed: true, note: `"${s.githubPath}" not found yet (will be created automatically on your first Push)` });
    }
  } catch {
    // Non-fatal file query
  }

  const ok = repoExists && canWrite && (branchExists || checks.some(c => c.passed));

  return {
    ok,
    username,
    repoName: `${s.githubOwner}/${s.githubRepo}`,
    repoExists,
    canWrite,
    branchExists,
    fileExists,
    fileSha,
    message: ok
      ? 'GitHub connection verified! All permissions and endpoints are ready for seamless Push & Pull.'
      : 'GitHub configuration requires adjustment. Check the diagnostics below.',
    checks
  };
}

export async function githubFetchRemote(s: Settings): Promise<{ exists: boolean; json: any | null; sha: string | null }> {
  const clean = cleanGithubSettings(s);
  const res = await fetch(`${githubApiUrl(clean)}?ref=${encodeURIComponent(clean.githubBranch || 'main')}`, {
    headers: { Authorization: getAuthHeader(clean.githubToken), Accept: 'application/vnd.github+json' }
  });
  if (res.status === 404) return { exists: false, json: null, sha: null };
  if (res.status === 401) throw new Error('github-auth-failed');
  if (res.status === 403) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    throw new Error(remaining === '0' ? 'github-rate-limited' : 'github-permission-denied');
  }
  if (!res.ok) throw new Error(`github-request-failed:${res.status}`);
  const data = await res.json();
  let json = null;
  try {
    json = JSON.parse(base64ToUtf8(data.content));
  } catch (_) {
    throw new Error('github-bad-content');
  }
  return { exists: true, json, sha: data.sha };
}

export async function githubPushRemote(state: AppState, retrying = false): Promise<string> {
  const clean = cleanGithubSettings(state.settings);
  const payload = JSON.stringify({
    categories: state.categories,
    sheets: state.sheets,
    trips: state.trips,
    trash: state.trash,
    activityLog: state.activityLog
  }, null, 2);

  const body: any = {
    message: `Travel Ledger sync — ${new Date().toISOString()}`,
    content: utf8ToBase64(payload),
    branch: clean.githubBranch || 'main'
  };

  if (clean.githubSha) {
    body.sha = clean.githubSha;
  } else {
    const remote = await githubFetchRemote(clean);
    if (remote.exists) body.sha = remote.sha;
  }

  const res = await fetch(githubApiUrl(clean), {
    method: 'PUT',
    headers: {
      Authorization: getAuthHeader(clean.githubToken),
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (res.status === 409 && !retrying) {
    const remote = await githubFetchRemote(clean);
    if (!remote.exists || !remote.sha) throw new Error('github-no-remote');
    clean.githubSha = remote.sha;
    state.settings.githubSha = remote.sha;
    return githubPushRemote(state, true);
  }
  if (res.status === 401) throw new Error('github-auth-failed');
  if (res.status === 403) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    throw new Error(remaining === '0' ? 'github-rate-limited' : 'github-permission-denied');
  }
  if (!res.ok) throw new Error(`github-request-failed:${res.status}`);
  const data = await res.json();
  if (!data.content || !data.content.sha) throw new Error('github-invalid-response');
  return data.content.sha;
}

export function githubUserError(action: 'push' | 'pull', err: any): string {
  const prefix = action === 'push' ? 'Push' : 'Pull';
  switch (err && err.message) {
    case 'github-auth-failed':
      return `${prefix} failed: GitHub rejected the token (401 Bad Credentials). Verify token spelling or create a new token.`;
    case 'github-permission-denied':
      return `${prefix} failed: GitHub denied write access (403 Forbidden). Ensure your token has "Contents: Read and write" repository permissions.`;
    case 'github-rate-limited':
      return `${prefix} failed: GitHub API rate limit reached. Please wait a moment before trying again.`;
    case 'github-no-remote':
      return action === 'pull' ? 'No remote file exists in that GitHub path yet. Click Push Now first to initialize it.' : 'Push failed: remote file state shifted.';
    case 'github-conflict':
      return 'Push failed: Remote file was modified concurrently on GitHub. Click Push Now again to overwrite or Pull Now first.';
    case 'github-bad-content':
      return 'Pull failed: The remote file is not valid Travel Ledger JSON data.';
    case 'github-invalid-response':
      return `${prefix} failed: GitHub returned an unexpected response structure.`;
    default:
      return `${prefix} failed: ${err && err.message ? err.message : 'unexpected error'}`;
  }
}
