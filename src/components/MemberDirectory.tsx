import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import { Avatar, Ring } from './ui'
import { indexLetter } from '../lib/format'
import { percent } from '../lib/profile'
import type { Member } from '../lib/types'

const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))
const EMPTY = { name: '', mobile: '', company: '', category: '', designation: '' }

const has = (value: string, query: string) => value.toLowerCase().includes(query.trim().toLowerCase())

/**
 * The filtered A to Z list of a chapter's members, shared by the member E-Directory and the
 * Super Admin's view of a chapter. With `linkTo` each row opens that member; without it the rows only show.
 */
export default function MemberDirectory({ members, linkTo }: { members: Member[]; linkTo?: (m: Member) => string }) {
  const [f, setF] = useState(EMPTY)
  const [letter, setLetter] = useState('')
  /* On phones the filters start folded so the list is the first thing you see. */
  const [showFilters, setShowFilters] = useState(() => window.matchMedia('(min-width: 721px)').matches)

  const all = useMemo(() => [...members].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })), [members])

  const categories = useMemo(() => [...new Set(all.map((m) => m.category).filter(Boolean))].sort(), [all])
  const designations = useMemo(() => [...new Set(all.map((m) => m.designation).filter(Boolean))].sort(), [all])

  const matches = all.filter(
    (m) =>
      has(m.name, f.name) &&
      m.mobile.includes(f.mobile.trim()) &&
      has(m.organisation, f.company) &&
      (!f.category || m.category === f.category) &&
      (!f.designation || m.designation === f.designation),
  )
  const available = new Set(matches.map((m) => indexLetter(m.name)))
  const active = letter && available.has(letter) ? letter : ''
  const list = active ? matches.filter((m) => indexLetter(m.name) === active) : matches
  const activeFilters = Object.values(f).filter(Boolean).length
  const filtering = activeFilters > 0 || !!active

  /* Names are already sorted, so each letter's members sit together. */
  const groups: { letter: string; members: Member[] }[] = []
  for (const m of list) {
    const l = indexLetter(m.name)
    const last = groups[groups.length - 1]
    if (last && last.letter === l) last.members.push(m)
    else groups.push({ letter: l, members: [m] })
  }

  const set = (key: keyof typeof EMPTY) => (value: string) => setF((cur) => ({ ...cur, [key]: value }))

  function row(m: Member) {
    const cells = (
      <>
        <span className="crow__name">
          <Avatar name={m.name} photo={m.photo} size={42} />
          <b>{m.name}</b>
        </span>
        <span className="crow__co">{m.organisation || '—'}</span>
        <span className="crow__des">{m.designation}</span>
        <span className="crow__cat">{m.category ? <span className="chip chip--gold">{m.category}</span> : '—'}</span>
        <span className="crow__pct" title="Profile completed">
          <Ring pct={percent(m)} size={46} stroke={5} />
        </span>
      </>
    )
    return linkTo ? (
      <Link key={m.id} to={linkTo(m)} className="crow">
        {cells}
      </Link>
    ) : (
      <div key={m.id} className="crow">
        {cells}
      </div>
    )
  }

  return (
    <>
      <button className="btn btn--line filters-toggle" onClick={() => setShowFilters((o) => !o)} aria-expanded={showFilters}>
        <SlidersHorizontal size={16} /> Filters
        {activeFilters > 0 && <span className="badge">{activeFilters}</span>}
      </button>

      <section className={`fbar ${showFilters ? 'is-open' : ''}`} aria-label="Filters">
        <label className="field">
          <span className="field__label">Name</span>
          <input className="field__control" value={f.name} onChange={(e) => set('name')(e.target.value)} placeholder="Search name" />
        </label>
        <label className="field">
          <span className="field__label">Mobile no</span>
          <input
            className="field__control"
            inputMode="numeric"
            value={f.mobile}
            onChange={(e) => set('mobile')(e.target.value.replace(/\D/g, ''))}
            placeholder="Search mobile"
          />
        </label>
        <label className="field">
          <span className="field__label">Company name</span>
          <input className="field__control" value={f.company} onChange={(e) => set('company')(e.target.value)} placeholder="Search company" />
        </label>
        <label className="field">
          <span className="field__label">Category</span>
          <select className="field__control native-select" value={f.category} onChange={(e) => set('category')(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Designation</span>
          <select className="field__control native-select" value={f.designation} onChange={(e) => set('designation')(e.target.value)}>
            <option value="">All designations</option>
            {designations.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        {filtering && (
          <button
            className="btn btn--line btn--sm fbar__clear"
            onClick={() => {
              setF(EMPTY)
              setLetter('')
            }}
          >
            <X size={14} /> Clear
          </button>
        )}
      </section>

      <div className="dir2">
        <section aria-label="Members">
          <div className="dir2__cols" aria-hidden>
            <span>Name</span>
            <span>Company Name</span>
            <span>Designation</span>
            <span>Category</span>
            <span className="dir2__pct">Profile</span>
          </div>

          {groups.length === 0 ? (
            <div className="empty">
              <b>No members found.</b>
              {all.length === 0 ? 'This chapter has no members yet.' : 'Try changing or clearing the filters.'}
            </div>
          ) : (
            groups.map((g) => (
              <div className="grp" key={g.letter}>
                <div className="grp__rows">{g.members.map(row)}</div>
              </div>
            ))
          )}
        </section>

        <nav className="rail" aria-label="Jump to letter">
          <button className={`rail__all ${active ? '' : 'is-on'}`} onClick={() => setLetter('')}>
            All
          </button>
          {LETTERS.map((l) => (
            <button
              key={l}
              className={active === l ? 'is-on' : ''}
              disabled={!available.has(l)}
              onClick={() => setLetter(active === l ? '' : l)}
              aria-label={`Names starting with ${l}`}
              aria-pressed={active === l}
            >
              {l}
            </button>
          ))}
        </nav>
      </div>
    </>
  )
}
