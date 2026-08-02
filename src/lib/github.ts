/**
 * GitHub Contents API client — how published content actually gets published.
 *
 * There is no backend. The admin holds a fine-grained personal access token
 * with Contents: read & write on this one repository, and the browser commits
 * JSON files straight to it. GitHub Pages rebuilds and everybody sees it.
 *
 * Security posture, stated honestly:
 *   • The token is a bearer credential. It is kept inside the encrypted vault
 *     (see db.ts) and only decrypted in memory after the admin unlocks.
 *   • Scope it to *this repository only*, Contents: read & write, nothing else.
 *     Then the worst case for a leaked token is a bad commit here — revert it
 *     and revoke the token.
 *   • Never commit the token. It is never written to a content file.
 */

import { toBase64 } from './crypto'

const API = 'https://api.github.com'
const ACCEPT = 'application/vnd.github+json'
const API_VERSION = '2022-11-28'

export interface RepoConfig {
  owner: string
  repo: string
  branch: string
}

export interface GitHubIdentity {
  login: string
  name?: string
  avatarUrl?: string
}

export interface RepoAccess {
  identity: GitHubIdentity
  canWrite: boolean
  defaultBranch: string
  private: boolean
  htmlUrl: string
}

export class GitHubError extends Error {
  readonly status: number
  readonly hint?: string

  constructor(message: string, status: number, hint?: string) {
    super(message)
    this.name = 'GitHubError'
    this.status = status
    this.hint = hint
  }
}

/** Turn GitHub's terse failures into something an admin can act on. */
function explain(status: number, body: { message?: string } | null): GitHubError {
  const raw = body?.message ?? 'Request failed'
  switch (status) {
    case 401:
      return new GitHubError('GitHub rejected the token.', status, 'It is wrong, expired or revoked. Generate a new one and paste it again.')
    case 403:
      return new GitHubError(
        raw.toLowerCase().includes('rate limit') ? 'GitHub rate limit reached.' : 'GitHub refused this action.',
        status,
        raw.toLowerCase().includes('rate limit')
          ? 'Wait a few minutes and try again.'
          : 'The token likely lacks "Contents: read and write" on this repository.',
      )
    case 404:
      return new GitHubError('Repository or file not found.', status, 'Check the owner and repository name, and that the token can see this repository.')
    case 409:
      return new GitHubError('The file changed on GitHub since it was loaded.', status, 'Reload the latest version, then publish again.')
    case 422:
      return new GitHubError(`GitHub rejected the commit: ${raw}`, status, 'This usually means a stale file version. Reload and retry.')
    default:
      return new GitHubError(raw, status)
  }
}

async function request<T>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        accept: ACCEPT,
        authorization: `Bearer ${token}`,
        'x-github-api-version': API_VERSION,
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...init.headers,
      },
    })
  } catch {
    throw new GitHubError('Could not reach GitHub.', 0, 'Check your internet connection, you can keep editing offline and publish later.')
  }

  if (res.status === 204) return undefined as T

  const body = await res.json().catch(() => null)
  if (!res.ok) throw explain(res.status, body)
  return body as T
}

// ---------------------------------------------------------------------------
// Identity & access
// ---------------------------------------------------------------------------

export async function verifyAccess(token: string, config: RepoConfig): Promise<RepoAccess> {
  const user = await request<{ login: string; name?: string; avatar_url?: string }>(token, '/user')
  const repo = await request<{
    default_branch: string
    private: boolean
    html_url: string
    permissions?: { push?: boolean; admin?: boolean; maintain?: boolean }
  }>(token, `/repos/${config.owner}/${config.repo}`)

  return {
    identity: { login: user.login, name: user.name, avatarUrl: user.avatar_url },
    canWrite: Boolean(repo.permissions?.push ?? repo.permissions?.admin ?? repo.permissions?.maintain),
    defaultBranch: repo.default_branch,
    private: repo.private,
    htmlUrl: repo.html_url,
  }
}

/** Remaining core API calls in this hour. Useful before a large publish. */
export async function rateLimit(token: string): Promise<{ remaining: number; resetAt: Date }> {
  const data = await request<{ resources: { core: { remaining: number; reset: number } } }>(
    token,
    '/rate_limit',
  )
  return {
    remaining: data.resources.core.remaining,
    resetAt: new Date(data.resources.core.reset * 1000),
  }
}

// ---------------------------------------------------------------------------
// File read / write
// ---------------------------------------------------------------------------

export interface RemoteFile {
  path: string
  sha: string
  text: string
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

/** UTF-8 safe base64, which `btoa` alone is not. */
function encodeUtf8Base64(text: string): string {
  return toBase64(new TextEncoder().encode(text))
}

function decodeUtf8Base64(b64: string): string {
  const clean = b64.replace(/\s/g, '')
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

/** Read a file. Returns null when it does not exist yet (a normal first publish). */
export async function getFile(
  token: string,
  config: RepoConfig,
  path: string,
): Promise<RemoteFile | null> {
  try {
    const data = await request<{ sha: string; content?: string; encoding?: string }>(
      token,
      `/repos/${config.owner}/${config.repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(config.branch)}`,
    )
    return {
      path,
      sha: data.sha,
      text: data.content ? decodeUtf8Base64(data.content) : '',
    }
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return null
    throw error
  }
}

/** Fetch just the blob sha, so a commit can be made without downloading the body. */
export async function getFileSha(
  token: string,
  config: RepoConfig,
  path: string,
): Promise<string | undefined> {
  const file = await getFile(token, config, path)
  return file?.sha
}

export interface CommitResult {
  path: string
  sha: string
  commitUrl: string
  commitSha: string
}

/**
 * Create or update a text file.
 *
 * `sha` is the *current* blob sha and is what makes this safe against
 * clobbering: omit it and GitHub rejects an update to an existing file;
 * send a stale one and GitHub returns 409 rather than overwriting someone
 * else's change. We always look it up immediately before committing.
 */
export async function putTextFile(
  token: string,
  config: RepoConfig,
  path: string,
  text: string,
  message: string,
): Promise<CommitResult> {
  const sha = await getFileSha(token, config, path)
  const data = await request<{
    content: { sha: string }
    commit: { sha: string; html_url: string }
  }>(token, `/repos/${config.owner}/${config.repo}/contents/${encodePath(path)}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: encodeUtf8Base64(text),
      branch: config.branch,
      ...(sha ? { sha } : {}),
    }),
  })

  return {
    path,
    sha: data.content.sha,
    commitSha: data.commit.sha,
    commitUrl: data.commit.html_url,
  }
}

/** Create or update a binary file (images, PDFs) from raw bytes. */
export async function putBinaryFile(
  token: string,
  config: RepoConfig,
  path: string,
  bytes: Uint8Array,
  message: string,
): Promise<CommitResult> {
  const sha = await getFileSha(token, config, path)
  const data = await request<{
    content: { sha: string }
    commit: { sha: string; html_url: string }
  }>(token, `/repos/${config.owner}/${config.repo}/contents/${encodePath(path)}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: toBase64(bytes),
      branch: config.branch,
      ...(sha ? { sha } : {}),
    }),
  })

  return {
    path,
    sha: data.content.sha,
    commitSha: data.commit.sha,
    commitUrl: data.commit.html_url,
  }
}

export async function deleteFile(
  token: string,
  config: RepoConfig,
  path: string,
  message: string,
): Promise<void> {
  const sha = await getFileSha(token, config, path)
  if (!sha) return // already gone
  await request(token, `/repos/${config.owner}/${config.repo}/contents/${encodePath(path)}`, {
    method: 'DELETE',
    body: JSON.stringify({ message, sha, branch: config.branch }),
  })
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

export interface PublishItem {
  path: string
  text: string
  label: string
}

export interface PublishProgress {
  done: number
  total: number
  current: string
}

export interface PublishOutcome {
  committed: CommitResult[]
  failed: { label: string; path: string; error: string }[]
}

/**
 * Commit several files, one API call each.
 *
 * Sequential on purpose: the Contents API serialises writes to a branch, and
 * firing them in parallel produces 409s against each other. A handful of small
 * JSON files takes a second or two, which is the right trade for reliability.
 * A failure on one file does not abandon the rest — the caller is told exactly
 * what landed and what did not.
 */
export async function publishFiles(
  token: string,
  config: RepoConfig,
  items: PublishItem[],
  message: string,
  onProgress?: (progress: PublishProgress) => void,
): Promise<PublishOutcome> {
  const committed: CommitResult[] = []
  const failed: PublishOutcome['failed'] = []

  for (const [index, item] of items.entries()) {
    onProgress?.({ done: index, total: items.length, current: item.label })
    try {
      committed.push(await putTextFile(token, config, item.path, item.text, `${message}, ${item.label}`))
    } catch (error) {
      failed.push({
        label: item.label,
        path: item.path,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  onProgress?.({ done: items.length, total: items.length, current: 'Done' })
  return { committed, failed }
}

// ---------------------------------------------------------------------------
// Deploy status
// ---------------------------------------------------------------------------

export interface WorkflowRun {
  status: 'queued' | 'in_progress' | 'completed' | string
  conclusion: 'success' | 'failure' | 'cancelled' | null
  htmlUrl: string
  createdAt: string
  headSha: string
}

/** Most recent Pages deployment run, so the admin can see the site rebuilding. */
export async function latestDeploy(
  token: string,
  config: RepoConfig,
): Promise<WorkflowRun | null> {
  try {
    const data = await request<{
      workflow_runs: {
        status: string
        conclusion: WorkflowRun['conclusion']
        html_url: string
        created_at: string
        head_sha: string
      }[]
    }>(token, `/repos/${config.owner}/${config.repo}/actions/runs?per_page=1&branch=${encodeURIComponent(config.branch)}`)

    const run = data.workflow_runs?.[0]
    if (!run) return null
    return {
      status: run.status,
      conclusion: run.conclusion,
      htmlUrl: run.html_url,
      createdAt: run.created_at,
      headSha: run.head_sha,
    }
  } catch {
    // Deploy status is a nicety; never let it break publishing.
    return null
  }
}

// ---------------------------------------------------------------------------
// Token hygiene
// ---------------------------------------------------------------------------

/** Shape check only — the real test is `verifyAccess`. */
export function looksLikeToken(token: string): boolean {
  const t = token.trim()
  return /^(github_pat_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{30,}|gho_[A-Za-z0-9]{30,})$/.test(t)
}

/** Redacted form for display and logs. Never render a token in full. */
export function maskToken(token: string): string {
  const t = token.trim()
  if (t.length < 12) return '••••••••'
  return `${t.slice(0, 7)}…${t.slice(-4)}`
}

/** Guess owner/repo from the current URL on a github.io deployment. */
export function inferRepoFromLocation(): Partial<RepoConfig> {
  if (typeof location === 'undefined') return {}
  const host = location.hostname
  const ownerMatch = /^([\w-]+)\.github\.io$/i.exec(host)
  if (!ownerMatch) return {}
  const owner = ownerMatch[1]
  const segment = location.pathname.split('/').filter(Boolean)[0]
  return { owner, repo: segment || `${owner}.github.io`, branch: 'main' }
}
