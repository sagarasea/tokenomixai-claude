import type { Engine, Register } from 'claude-code'

// Sisa kuota TokenomixAI di bawah kotak input. Data dari GET https://api.tokenomixai.com/v1/quota.
// Key dibaca dari settings Claude Code (ditulis installer TokenomixAI) dan hanya dikirim ke host itu.
// Bukan setup TokenomixAI = plugin diam.

const REFRESH_MS = 60_000
const STALE_MS = 10 * 60_000
const ALLOWED_BASE = /^(https:\/\/api\.tokenomixai\.com|http:\/\/(localhost|127\.0\.0\.1):\d+)$/
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

interface Quota {
  object: 'quota'
  hashtag: string
  status: 'active' | 'exhausted'
  remainingTokens: number | null
  maxTokens: number | null
  expiresAt: string | null
  low: boolean
}

const human = (n: number) => {
  const s = n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${Math.round(n / 1e6)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n)
  return s.replace(/\.0B$/, 'B').replace('.', ',')
}

export function describe(q: Quota): string {
  if (q.status === 'exhausted') return `${q.hashtag}: kuota habis atau expired. Top up di tokenomixai.com`
  if (q.remainingTokens == null) return ''
  let s = `${q.hashtag} · sisa ${human(q.remainingTokens)}`
  if (q.maxTokens) s += ` dari ${human(q.maxTokens)} (${Math.floor((q.remainingTokens * 100) / q.maxTokens)}%)`
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(q.expiresAt ?? '')
  if (m) s += ` · aktif s.d. ${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}`
  return q.low ? `${s} · hampir habis, top up di tokenomixai.com` : s
}

let shownAt = 0

async function refresh($: Engine) {
  const env = ((await $.settings.read({ key: 'env' })) ?? {}) as Record<string, unknown>
  const key = String(env.ANTHROPIC_AUTH_TOKEN ?? (await $.env.get('ANTHROPIC_AUTH_TOKEN')) ?? '')
  const base = String(env.ANTHROPIC_BASE_URL ?? (await $.env.get('ANTHROPIC_BASE_URL')) ?? '')
    .replace(/\/+$/, '')
    .replace(/\/v1$/, '')
  if (!/^sk-tkx-[A-Za-z0-9]+$/.test(key) || !ALLOWED_BASE.test(base)) return $.ui.status(undefined)
  try {
    const res = await $.http.fetch(`${base}/v1/quota`, { headers: { Authorization: `Bearer ${key}` } })
    const q = res.ok ? (JSON.parse(res.text) as Quota) : null
    if (q?.object === 'quota') {
      const text = describe(q)
      $.ui.status(text || undefined)
      shownAt = text ? await $.clock.now() : 0
      return
    }
  } catch {
    // jaringan putus: pertahankan angka terakhir sebentar
  }
  if (shownAt && (await $.clock.now()) - shownAt > STALE_MS) {
    $.ui.status(undefined)
    shownAt = 0
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await refresh($).catch(() => undefined)
    $.clock.every(REFRESH_MS, () => refresh($).catch(() => undefined))
    return result
  })
}
