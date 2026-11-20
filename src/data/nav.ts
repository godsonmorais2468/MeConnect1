import { Award, BookUser, CalendarCheck, House, IndianRupee, PartyPopper } from 'lucide-react'
import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'
import type { Role, Tone } from '../lib/types'

export interface NavItem {
  to: string
  label: string
  /** A shorter name for the narrow bottom bar on phones and tablets. */
  short?: string
  icon: ComponentType<LucideProps>
  tone: Tone
  end?: boolean
  /** Shows a number on the icon: how many dues are pending. */
  badge?: 'dues'
  /** Shown only to members whose designation is ticked "Head Table". */
  headTable?: boolean
  /** The Superadmin module code that must be on for this client; absent = always shown (the core). */
  module?: string
}

export const NAV: Record<Role, NavItem[]> = {
  member: [
    { to: '/', label: 'Home', icon: House, tone: 'gold', end: true },
    { to: '/directory', label: 'E-Directory', icon: BookUser, tone: 'red', module: 'DIRECTORY' },
    { to: '/attendance', label: 'Attendance', icon: CalendarCheck, tone: 'green', module: 'ATTENDANCE' },
    { to: '/office-bearers', label: 'Office Bearers', short: 'Bearers', icon: Award, tone: 'wine', module: 'OFFICE_BEARERS' },
    { to: '/wishes', label: 'Wishes', icon: PartyPopper, tone: 'navy', module: 'WISHES' },
    { to: '/dues', label: 'Dues', icon: IndianRupee, tone: 'gold', badge: 'dues', module: 'DUES' },
  ],
}

export const HOME: Record<Role, string> = {
  member: '/',
}
