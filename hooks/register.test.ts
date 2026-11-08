import { expect, test } from 'claude-code/testing'

const QUOTA = {
  object: 'quota', hashtag: '#TKX-ABC123', status: 'active', remainingTokens: 3_800_000_000, maxTokens: 5_000_000_000,
  usagePercent: 24, expiresAt: '2026-12-12T00:00:00.000Z', low: false, checkedAt: 'x', stale: false,
}

function engine(on: any, env: Record<string, string>, body: unknown, ok = true) {
  const statuses: Array<string | undefined> = []
  const fetched: Array<{ url: string; auth?: string }> = []
  on('settings.read', () => ({ value: { env } }))
  on('env.get', () => ({ value: undefined }))
  on('clock.now', () => ({ value: 1_000 }))
  on('clock.every', () => ({ value: undefined }))
  on('http.fetch', (_: unknown, e: { url: string; init?: { headers?: Record<string, string> } }) => {
    fetched.push({ url: e.url, auth: e.init?.headers?.Authorization })
    return { value: { status: ok ? 200 : 503, ok, headers: {}, text: JSON.stringify(body) } }
  })
  on('ui.status', (_: unknown, e: { text: string | undefined }) => {
    statuses.push(e.text)
    return { value: undefined }
  })
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  return { statuses, fetched }
}

const TKX = { ANTHROPIC_BASE_URL: 'https://api.tokenomixai.com', ANTHROPIC_AUTH_TOKEN: 'sk-tkx-abc123' }

test('shows the remaining quota under the prompt', async ($, on) => {
  const r = engine(on, TKX, QUOTA)
  await $.session.start({ cwd: '/', surface: 'vscode', isInteractive: true })
  expect(r.fetched).toEqual([{ url: 'https://api.tokenomixai.com/v1/quota', auth: 'Bearer sk-tkx-abc123' }])
  expect(r.statuses.at(-1)).toBe('#TKX-ABC123 · sisa 3,8B dari 5B (76%) · aktif s.d. 12 Des')
})

test('warns when low and when used up', async ($, on) => {
  const r = engine(on, TKX, { ...QUOTA, remainingTokens: 300_000_000, low: true })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  expect(r.statuses.at(-1)).toBe('#TKX-ABC123 · sisa 300M dari 5B (6%) · aktif s.d. 12 Des · hampir habis, top up di tokenomixai.com')
})

test('used up', async ($, on) => {
  const r = engine(on, TKX, { ...QUOTA, remainingTokens: 0, low: true, status: 'exhausted' })
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  expect(r.statuses.at(-1)).toBe('#TKX-ABC123: kuota habis atau expired. Top up di tokenomixai.com')
})

test('never sends the key anywhere else and stays silent outside TokenomixAI', async ($, on) => {
  const r = engine(on, { ANTHROPIC_BASE_URL: 'https://evil.example.com', ANTHROPIC_AUTH_TOKEN: 'sk-tkx-abc123' }, QUOTA)
  await $.session.start({ cwd: '/', surface: 'vscode', isInteractive: true })
  expect(r.fetched).toEqual([])
  expect(r.statuses.filter(Boolean)).toEqual([])
})

test('a failed request shows nothing new', async ($, on) => {
  const r = engine(on, TKX, { error: 'x' }, false)
  await $.session.start({ cwd: '/', surface: 'vscode', isInteractive: true })
  expect(r.fetched.length).toBe(1)
  expect(r.statuses.filter(Boolean)).toEqual([])
})
