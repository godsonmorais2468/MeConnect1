import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Loader2, ServerCrash, ShieldOff } from 'lucide-react'
import { loadTenant, useTenant } from '../lib/tenant'

/**
 * Finds out which client this address belongs to before anything else opens (live mode only; the prototype has no
 * clients). An address that is not set up, or a client that has been switched off, shows a plain message instead of a
 * login that could never work.
 */
export default function TenantGate({ children }: { children: ReactNode }) {
  const { status, problem } = useTenant()

  useEffect(() => {
    void loadTenant()
  }, [])

  if (status === 'ready') return <>{children}</>

  if (status === 'loading') {
    return (
      <div className="tenant-gate" role="status" aria-live="polite">
        <Loader2 size={26} className="spin" aria-hidden />
        <p>Loading…</p>
      </div>
    )
  }

  const Icon = problem?.kind === 'offline' ? ServerCrash : ShieldOff
  const title = problem?.kind === 'inactive' ? 'This organisation is not active' : problem?.kind === 'offline' ? 'Cannot reach the server' : 'This address is not set up'
  return (
    <div className="tenant-gate" role="alert">
      <Icon size={34} aria-hidden />
      <h1>{title}</h1>
      <p>{problem?.message}</p>
      {problem?.kind === 'offline' && (
        <button type="button" className="btn btn--primary" onClick={() => void loadTenant()}>
          Try again
        </button>
      )}
    </div>
  )
}
