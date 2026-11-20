import { useSyncExternalStore } from 'react'
import { apiRequest, isRealApi } from './api'

/** The client (organisation) this app is serving, as the member API describes it. */
export interface Tenant {
  id: string
  name: string
  template: string | null
  /** Module codes the client has been given (the Superadmin decides). */
  modules: string[]
}

export interface TenantState {
  status: 'loading' | 'ready' | 'error'
  tenant: Tenant | null
  /** Why the app cannot open, when status is 'error'. */
  problem?: { kind: 'unknown' | 'inactive' | 'offline'; message: string }
}

/* The prototype has no clients: it is always "ready", with every module on. */
let state: TenantState = isRealApi ? { status: 'loading', tenant: null } : { status: 'ready', tenant: null }
const listeners = new Set<() => void>()

function set(next: TenantState) {
  state = next
  listeners.forEach((l) => l())
}

export async function loadTenant(): Promise<void> {
  if (!isRealApi) return
  set({ status: 'loading', tenant: null })
  const res = await apiRequest<Tenant>('/tenant/')
  /* an error answer also carries a body, so success means: no error and a client came back */
  if (!res.error && res.data) {
    set({ status: 'ready', tenant: res.data })
    document.title = res.data.name
    return
  }
  if (res.status === 0) {
    set({ status: 'error', tenant: null, problem: { kind: 'offline', message: 'The server could not be reached. Check your connection and try again.' } })
    return
  }
  /* the server's wording is for developers; people get a plain sentence */
  const inactive = res.code === 'tenant_inactive'
  set({
    status: 'error',
    tenant: null,
    problem: {
      kind: inactive ? 'inactive' : 'unknown',
      message: inactive
        ? 'This organisation is not active right now. Please contact your administrator.'
        : 'This address is not linked to an organisation yet. Check the link you were given, or contact your administrator.',
    },
  })
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Resolves once the client lookup has finished: true if the app can open, false if this address cannot be used. */
export function whenTenantReady(): Promise<boolean> {
  return new Promise((resolve) => {
    if (state.status !== 'loading') return resolve(state.status === 'ready')
    const off = subscribe(() => {
      if (state.status === 'loading') return
      off()
      resolve(state.status === 'ready')
    })
  })
}

export const useTenant = () => useSyncExternalStore(subscribe, () => state)

/** The same answer outside a component (the data sync uses it): true when the client is not known yet or in the prototype. */
export function moduleIsOn(code?: string) {
  return !code || !isRealApi || !state.tenant || state.tenant.modules.includes(code)
}

/** Whether a module is on for this client. Everything is on in the prototype, and until the client is known. */
export function useModuleOn() {
  const { tenant } = useTenant()
  return (code?: string) => !code || !isRealApi || !tenant || tenant.modules.includes(code)
}

/* Which Superadmin module each page belongs to (the first match wins, so a longer path comes before its parent). A page whose
   module is off for this client is not reachable by typing its address either: the menu, the home screen and the tile pages
   already hide it. */
const ROUTE_MODULES: [string, string][] = [
  ['/directory', 'DIRECTORY'],
  ['/office-bearers', 'OFFICE_BEARERS'],
  ['/wishes', 'WISHES'],
  ['/attendance', 'ATTENDANCE'],
  ['/manage-rsvp', 'POLLS'],
  ['/rsvp', 'POLLS'],
  ['/meetings', 'MEETINGS'],
  ['/team', 'CHAPTER_TEAM'],
  ['/visitor', 'VISITORS'],
  ['/due-list', 'DUE_LIST'],
  ['/dues', 'DUES'],
  ['/payments/collection', 'RPT_COLLECTION'],
  ['/payments', 'PAYMENTS'],
  ['/accounts/vouchers', 'VOUCHERS'],
  ['/accounts', 'ACCOUNTS'],
  ['/reports/dues', 'RPT_DUES'],
  ['/reports/ledger', 'RPT_LEDGER'],
  ['/reports/attendance', 'RPT_ATTENDANCE'],
  ['/reports/app-usage', 'RPT_APP_USAGE'],
]

/** The module a page address belongs to, or undefined for the always-on core (home, profile, help, ...). */
export function moduleForPath(path: string): string | undefined {
  return ROUTE_MODULES.find(([p]) => path === p || path.startsWith(p + '/'))?.[1]
}
