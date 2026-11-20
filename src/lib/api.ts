/**
 * Settings that can change without a rebuild, from /config.js (a plain script loaded before the app, see index.html and
 * public/config.js). One build then serves every client domain; the server's copy of config.js says where the API is.
 */
type RuntimeConfig = { apiUrl?: string; tenantHost?: string; demoHosts?: string[] | string }
const RUNTIME: RuntimeConfig = (typeof window !== 'undefined' && (window as unknown as { __APP_CONFIG__?: RuntimeConfig }).__APP_CONFIG__) || {}

/*
 * Two modes, chosen when the page opens, from the address it was opened on:
 *  - PROTOTYPE: requests are answered in the browser from sample data (demoApi.ts). This is what a preview shows.
 *  - LIVE: the app talks to the Me-Connect member API and finds its client from the address. This is what a client's own domain gets.
 *
 * Live needs an API address (config.js, else VITE_API_URL at build time). Where that address is set but the site must still
 * be the prototype (the template's own preview address on Render, say), list the preview addresses in config.js as
 * `demoHosts`: `['preview-site.onrender.com', '*.onrender.com', 'localhost']`. Any other address is a client's and goes live.
 * On a preview address, `?tenant=<client domain>` opens it live as that client for testing (remembered in this browser);
 * `?tenant=demo` goes back to the prototype.
 */
const API_BASE = ((RUNTIME.apiUrl || (import.meta.env.VITE_API_URL as string | undefined) || '') as string).trim().replace(/\/+$/, '')

const TENANT_KEY = 'me-connect:tenant-host'

/** True when the address matches an entry: an exact host, or `*.example.com` for any sub-domain of it. */
function hostMatches(host: string, entries: string[]) {
  return entries.some((e) => (e.startsWith('*.') ? host === e.slice(2) || host.endsWith(e.slice(1)) : host === e))
}

const DEMO_HOSTS = (Array.isArray(RUNTIME.demoHosts) ? RUNTIME.demoHosts : String(RUNTIME.demoHosts ?? '').split(','))
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean)
const onPreviewHost = typeof window !== 'undefined' && hostMatches(window.location.hostname.toLowerCase(), DEMO_HOSTS)

/** A client named in the address (`?tenant=`) or remembered from an earlier visit. `?tenant=demo` (or empty) forgets it. */
function readTenantOverride(): string {
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.has('tenant')) {
      const asked = (params.get('tenant') || '').trim().toLowerCase()
      if (asked === '' || asked === 'demo' || asked === 'off') window.localStorage.removeItem(TENANT_KEY)
      else window.localStorage.setItem(TENANT_KEY, asked)
    }
    return window.localStorage.getItem(TENANT_KEY) || ''
  } catch {
    return ''
  }
}
const OVERRIDE = typeof window !== 'undefined' ? readTenantOverride() : ''
const FIXED_TENANT = (RUNTIME.tenantHost || (import.meta.env.VITE_TENANT_HOST as string | undefined) || '').trim()

export const isRealApi = API_BASE !== '' && (!onPreviewHost || OVERRIDE !== '' || FIXED_TENANT !== '')

/** Everything this app keeps in the browser gets this suffix in real mode, so it never mixes with the prototype's sample data. */
export const NS = isRealApi ? ':live' : ''

const TOKENS_KEY = `me-connect:tokens${NS}`

/* ---------- which client this app is for ---------- */

/**
 * The address the member API should treat as "this client". On the client's own domain that is simply the page's address.
 * While testing on another address, name the client once with ?tenant=<its domain>. `tenantHost` in config.js (or
 * VITE_TENANT_HOST at build time) fixes it.
 */
export function tenantHost(): string {
  return FIXED_TENANT || OVERRIDE || window.location.host
}

/* ---------- sign-in tokens ---------- */

export function getTokens() {
  const raw = localStorage.getItem(TOKENS_KEY) || sessionStorage.getItem(TOKENS_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as { access: string; refresh: string }
  } catch {
    return null
  }
}

export function setTokens(tokens: { access: string; refresh: string }, remember: boolean) {
  const store = remember ? localStorage : sessionStorage
  store.setItem(TOKENS_KEY, JSON.stringify(tokens))
}

export function clearTokens() {
  localStorage.removeItem(TOKENS_KEY)
  sessionStorage.removeItem(TOKENS_KEY)
}

const NO_TOKEN = ['/auth/login/', '/auth/password-reset/request/', '/auth/password-reset/verify/', '/auth/password-reset/confirm/', '/tenant/']

function isPublic(endpoint: string) {
  return NO_TOKEN.includes(endpoint) || endpoint.startsWith('/chapters/public/')
}

/* ---------- events the screens listen for ---------- */

export const SUBSCRIPTION_REQUIRED_EVENT = 'me-connect:subscription-required'

let lastSubscriptionNotice = 0

const SUBSCRIPTION_CODES = [
  'payment_pending',
  'subscription_expired',
  'subscription_not_started',
  'subscription_past_due',
  'subscription_cancelled',
  'subscription_missing',
  'region_inactive',
  'region_subscription_required',
  'chapter_subscription_required',
  'subscription_required',
]

function announceSubscriptionRequired(data: { code?: unknown }) {
  if (typeof data?.code !== 'string' || !SUBSCRIPTION_CODES.includes(data.code)) return
  const now = Date.now()
  if (now - lastSubscriptionNotice < 1_000) return
  lastSubscriptionNotice = now
  window.dispatchEvent(new CustomEvent(SUBSCRIPTION_REQUIRED_EVENT, { detail: data }))
}

export type ApiResult<T> = { data?: T; error?: string; code?: string; status: number }

/** Why this address cannot be used: the client is unknown or switched off. */
export const TENANT_PROBLEM_CODES = ['tenant_unknown', 'tenant_inactive']

export function apiRequest<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  if (!isRealApi) return import('./demoApi').then((m) => m.demoRequest<T>(endpoint, options))
  return realRequest<T>(endpoint, options)
}

async function realRequest<T>(endpoint: string, options: RequestInit, retried = false): Promise<ApiResult<T>> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-Host': tenantHost(),
    ...((options.headers as Record<string, string>) || {}),
  }

  /* Signing in, reset, and public visitor pages never carry a saved token. */
  const tokens = isPublic(endpoint) ? null : getTokens()
  if (tokens?.access) headers['Authorization'] = `Bearer ${tokens.access}`

  try {
    const res = await fetch(url, { ...options, headers })
    const status = res.status
    const data = status === 204 ? null : await res.json().catch(() => null)

    /* The saved token is no longer good: it expired, the person was removed, or it belongs to another client.
       Drop it and try once as a visitor, so public pages keep working instead of failing. */
    const code = typeof data?.code === 'string' ? data.code : undefined
    if (tokens?.access && !retried && (status === 401 || code === 'tenant_mismatch')) {
      clearTokens()
      return realRequest<T>(endpoint, options, true)
    }

    if (status === 204) return { status }
    if (!res.ok) {
      const err = data?.detail || data?.error || (data && typeof data === 'object' ? Object.values(data)[0] : 'Request failed')
      if (status === 403 && code) announceSubscriptionRequired(data)
      return { error: Array.isArray(err) ? String(err[0]) : String(err || 'Server error'), code, status, data }
    }
    return { data: data as T, status }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not reach the server', status: 0 }
  }
}
