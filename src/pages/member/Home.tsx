import { useState, useRef, useEffect } from 'react'
import type { ComponentType, CSSProperties } from 'react'
import { AnimatePresence, m } from 'motion/react'
import type { LucideProps } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ArrowRight, Award, BookUser, CalendarCheck, CalendarClock, ChevronDown, ClipboardList, FileChartColumn, HandCoins, IndianRupee, Landmark, ListChecks, Map, PartyPopper, QrCode as QrCodeIcon, Settings, UserCheck, Users, X } from 'lucide-react'
import { Avatar, Glyph } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { OPENS_BEFORE_MIN, currentMeeting, phaseOf, windowOf } from '../../lib/attendance'
import { totalOf } from '../../lib/dues'
import { hasAttendancePermission, hasVisitorHostPermission, isHeadTable } from '../../lib/designations'
import { fmtDate, fmtTime, firstName, inr } from '../../lib/format'
import { CoordinatorQr, MeetingBrief } from './Attendance'
import { useNow } from '../../lib/hooks'
import { fetchDueList, syncWithBackend, useDB } from '../../lib/store'
import type { Attendance, Meeting, Member, Tone } from '../../lib/types'
import { wishesFor } from '../../lib/wishes'
import { BEARER_GROUPS } from '../../data/bearers'

const MotionLink = m.create(Link)
/* the Control Panel folds open and shut with the same motion: its box grows and shrinks, so the page below follows it smoothly */
const FOLD = { duration: 0.45, ease: [0.32, 0.72, 0, 1], opacity: { duration: 0.3, ease: 'easeOut' } } as const
const SPRING = { type: 'spring', stiffness: 260, damping: 22 } as const

/** The one-line attendance status shown on the dashboard. */
function attendanceStatus(meeting: Meeting | undefined, mark: Attendance | undefined, now: number) {
  if (!meeting) return { text: 'No meetings scheduled yet.', label: 'No meeting', tone: 'idle' }
  const phase = phaseOf(meeting, now)
  if (mark) return { text: `${meeting.title} · marked present at ${fmtTime(mark.at)}`, label: 'Marked', tone: 'ok' }
  if (phase === 'open') return { text: `${meeting.title} is open. Mark your attendance now.`, label: 'Not marked', tone: 'bad' }
  if (phase === 'upcoming') {
    return { text: `${meeting.title} on ${fmtDate(meeting.startsAt, { weekday: 'short', day: 'numeric', month: 'short' })}, ${fmtTime(meeting.startsAt)}`, label: 'Upcoming', tone: 'idle' }
  }
  return { text: `You did not mark attendance for ${meeting.title}.`, label: 'Not marked', tone: 'bad' }
}

export default function Home() {
  const { member, chapter, region } = useAuth()
  const db = useDB()
  /* with the Due List switched on, it sits beside the E-Directory on phones */
  const dueListOn = Boolean(chapter && db.chapters.find((c) => c.id === chapter.id)?.dueListEnabled)
  const now = useNow(30_000)
  /* how many members have dues to pay, shown on the Chapter Dues tile; null until the server answers */
  const [dueCount, setDueCount] = useState<number | null>(null)
  const [ctrlOpen, setCtrlOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  /* pointing at the E-Directory card deals its contact cards out again */
  const [deal, setDeal] = useState(0)
  const lastDeal = useRef(0)
  const [rise, setRise] = useState(0)
  const lastRise = useRef(0)
  const replayPodium = () => {
    const now = Date.now()
    if (now - lastRise.current < 1200) return
    lastRise.current = now
    setRise((n) => n + 1)
  }
  const replayFan = () => {
    const now = Date.now()
    if (now - lastDeal.current < 1000) return
    lastDeal.current = now
    setDeal((n) => n + 1)
  }
  const ctrlRef = useRef<HTMLDivElement>(null)
  const ctrlBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!dueListOn) return
    let live = true
    void fetchDueList().then((res) => {
      if (live && res) setDueCount(res.members.length)
    })
    return () => {
      live = false
    }
  }, [dueListOn])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (ctrlBtnRef.current && ctrlBtnRef.current.contains(target)) {
        return
      }
      if (ctrlRef.current && !ctrlRef.current.contains(target)) {
        setCtrlOpen(false)
      }
    }
    if (ctrlOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [ctrlOpen])

  if (!member) return null

  const canControl = isHeadTable(db, member)
  const canAttendance = hasAttendancePermission(db, member)
  const canVisitor = hasVisitorHostPermission(db, member)
  const canShowControls = canControl || canVisitor
  const mates = db.members.filter((m) => m.chapterId === member.chapterId)
  const meeting = currentMeeting(db.meetings.filter((m) => m.chapterId === member.chapterId), now)
  const att = attendanceStatus(meeting, meeting ? db.attendance.find((a) => a.meetingId === meeting.id && a.memberId === member.id) : undefined, now)
  const todays = wishesFor(mates, now).filter((w) => w.daysAway === 0)
  const nBirthdays = todays.filter((w) => w.kind === 'birthday').length
  const nAnniversaries = todays.length - nBirthdays
  const wishText = todays.length
    ? [nBirthdays && `${nBirthdays} ${nBirthdays === 1 ? 'birthday' : 'birthdays'}`, nAnniversaries && `${nAnniversaries} ${nAnniversaries === 1 ? 'anniversary' : 'anniversaries'}`].filter(Boolean).join(' and ') + ' today'
    : 'No birthdays or anniversaries today.'
  const pending = db.invoices.filter((i) => i.memberId === member.id && i.status === 'due')
  const waiting = db.polls.filter((p) => p.chapterId === member.chapterId && !p.closed && !db.votes.some((v) => v.pollId === p.id && v.memberId === member.id))
  const bearers = mates.filter((m) => BEARER_GROUPS.some((g) => g.match(m.designation)))
  const rankOf = (m: Member) => BEARER_GROUPS.findIndex((g) => g.match(m.designation))
  const ranked = [...bearers].sort((a, b) => rankOf(a) - rankOf(b))
  const hour = new Date(now).getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="page">
      <section className="hello">
        <div>
          <h1>
            {[`${greeting},`, firstName(member.name)].map((line, i) => (
              <span className="hello__line" key={i} style={{ animationDelay: `${0.08 + i * 0.12}s` }}>
                {line}
              </span>
            ))}
          </h1>
          <p>Welcome back to your chapter.</p>
          <div className="chips">
            <span className="chip chip--gold">{member.designation}</span>
            {chapter && (
              <span className="chip">
                <Landmark size={13} /> {chapter.name}
              </span>
            )}
            {region && (
              <span className="chip">
                <Map size={13} /> {region.name}
              </span>
            )}
          </div>
        </div>

        {(canShowControls || canAttendance) && (
          <div className="ctrl-actions">
            {canAttendance && (
              <button type="button" className="ctrl-qr-btn" onClick={() => setQrOpen(true)} title="Show Attendance QR code" aria-label="Show Attendance QR code">
                <QrCodeIcon size={19} />
              </button>
            )}

            {canShowControls && (
              <button
                ref={ctrlBtnRef}
                type="button"
                className={`ctrl-btn ${ctrlOpen ? 'is-open' : ''}`}
                onClick={() => setCtrlOpen((v) => !v)}
                aria-expanded={ctrlOpen}
                aria-label="Chapter control panel"
              >
                <Settings size={18} />
                <span>Control Panel</span>
                <ChevronDown size={15} style={{ transform: ctrlOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
            )}
          </div>
        )}
      </section>

      <AnimatePresence initial={false}>
      {canShowControls && ctrlOpen && (
        <m.div className="ctrlwrap" initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={FOLD}>
        <m.section className="ctrl" ref={ctrlRef} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={FOLD}>
          <div className="ctrl__title">Chapter Controls</div>
          <div className="ctrl__grid">
            {/* order: Accounts, Team, Meetings, Polls, Payments, Visitor, Reports, Settings */}
            {canControl && (
              <>
                <ControlCard i={0} to="/accounts" icon={Landmark} tone="steel" title="Accounts" sub="Masters" onPick={() => setCtrlOpen(false)} />
                <ControlCard i={1} to="/team" icon={Users} tone="green" title="Team" sub="Chapter" onPick={() => setCtrlOpen(false)} />
                <ControlCard i={2} to="/meetings" icon={CalendarClock} tone="gold" title="Meetings" sub="Schedules" onPick={() => setCtrlOpen(false)} />
                <ControlCard i={3} to="/manage-rsvp" icon={ListChecks} tone="green" title="Polls" sub="Responses" onPick={() => setCtrlOpen(false)} />
                <ControlCard i={4} to="/payments" icon={HandCoins} tone="navy" title="Payments" sub="Collect" onPick={() => setCtrlOpen(false)} />
              </>
            )}
            {canVisitor && <ControlCard i={5} to="/visitor" icon={UserCheck} tone="red" title="Visitor" sub="Host QR" onPick={() => setCtrlOpen(false)} />}
            {canControl && (
              <>
                <ControlCard i={6} to="/reports" icon={FileChartColumn} tone="gold" title="Reports" sub="Analytics" onPick={() => setCtrlOpen(false)} />
                <ControlCard i={7} to="/settings" icon={Settings} tone="steel" title="Settings" sub="Chapter" onPick={() => setCtrlOpen(false)} />
              </>
            )}
          </div>
        </m.section>
        </m.div>
      )}
      </AnimatePresence>

      <div className="home">
        <div className="hlist">
          {dueListOn && (
            <Link to="/due-list" className="hrow hrow--flag">
              <Glyph icon={ClipboardList} tone="gold" size={44} />
              <div className="hrow__txt">
                <h2>Chapter Dues</h2>
                <p>See which members have dues to pay.</p>
              </div>
              {dueCount !== null && <span className={`stat stat--${dueCount ? 'bad' : 'ok'}`}>{dueCount ? `${dueCount} pending` : 'All clear'}</span>}
              <ArrowRight size={18} className="hrow__go" />
            </Link>
          )}

          <Link to="/attendance" className="hrow">
            <Glyph icon={CalendarCheck} tone="green" size={44} />
            <div className="hrow__txt">
              <h2>Attendance</h2>
              <p>{att.text}</p>
            </div>
            <span className={`stat stat--${att.tone}`}>{att.label}</span>
            <ArrowRight size={18} className="hrow__go" />
          </Link>

          <Link to="/dues" className="hrow">
            <Glyph icon={IndianRupee} tone="gold" size={44} />
            <div className="hrow__txt">
              <h2>Dues</h2>
              <p>{pending.length ? `${inr(totalOf(pending))} to pay across ${pending.length} ${pending.length === 1 ? 'invoice' : 'invoices'}` : 'You have no pending dues.'}</p>
            </div>
            <span className={`stat ${pending.length ? 'stat--bad' : 'stat--ok'}`}>{pending.length ? `${pending.length} pending` : 'All paid'}</span>
            <ArrowRight size={18} className="hrow__go" />
          </Link>

          <Link to="/rsvp" className="hrow">
            <Glyph icon={ListChecks} tone="green" size={44} />
            <div className="hrow__txt">
              <h2>Polls</h2>
              <p>{waiting.length ? `${waiting.length} ${waiting.length === 1 ? 'poll is' : 'polls are'} waiting for your response.` : 'No polls waiting for you.'}</p>
            </div>
            <span className={`stat ${waiting.length ? 'stat--bad' : 'stat--ok'}`}>{waiting.length ? `${waiting.length} to answer` : 'All answered'}</span>
            <ArrowRight size={18} className="hrow__go" />
          </Link>

          <Link to="/wishes" className="hrow">
            <Glyph icon={PartyPopper} tone="navy" size={44} />
            <div className="hrow__txt">
              <h2>Wishes</h2>
              <p>{wishText}</p>
            </div>
            <ArrowRight size={18} className="hrow__go" />
          </Link>
        </div>

        <div className="hside">
          <MotionLink to="/directory" className="hcard hcard--pine hcard--dir" onHoverStart={replayFan} whileHover={{ y: -4 }} whileTap={{ scale: 0.985 }} transition={SPRING}>
            <div className="hcard__top">
              <Glyph icon={BookUser} tone="red" size={44} />
              <ArrowRight size={18} className="hrow__go" />
            </div>
            <div>
              <h2>E-Directory</h2>
              <p>
                {mates.length} {mates.length === 1 ? 'member' : 'members'} of {chapter?.name}
              </p>
            </div>
            <Fan key={deal} people={mates} replay={deal > 0} />
          </MotionLink>

          <MotionLink to="/office-bearers" className="hcard hcard--bear" onHoverStart={replayPodium} whileHover={{ y: -4 }} whileTap={{ scale: 0.985 }} transition={SPRING}>
            <div className="hcard__top">
              <Glyph icon={Award} tone="gold" size={44} />
              <ArrowRight size={18} className="hrow__go" />
            </div>
            <div>
              <h2>Office Bearers</h2>
              <p>President, Vice President, Secretary / Treasurer, Ambassadors, Launch Team and Coordinators</p>
            </div>
            <Podium key={rise} people={ranked} />
          </MotionLink>
        </div>
      </div>

      {qrOpen && <AttendanceQrDialog chapterId={member.chapterId} onClose={() => setQrOpen(false)} />}
    </div>
  )
}

/** The chapter's members as a hand of contact cards, fanned out like a rolodex. Hovering the card spreads the fan wider. */
function Fan({ people, replay }: { people: Member[]; replay: boolean }) {
  const shown = people.slice(0, 6)
  const more = people.length - shown.length
  const count = shown.length + (more > 0 ? 1 : 0)
  /* each card sits this many steps left or right of the middle one */
  const at = (i: number) => ({ '--o': i - (count - 1) / 2, '--i': i }) as CSSProperties
  return (
    <div className={`fan${replay ? ' fan--replay' : ''}`} aria-hidden>
      <div className="fan__pivot">
        {shown.map((p, i) => (
          <span className="fan__card" key={p.id} style={at(i)}>
            <Avatar name={p.name} photo={p.photo} size={30} />
            <b>{firstName(p.name)}</b>
            <i />
            <i />
          </span>
        ))}
        {more > 0 && (
          <span className="fan__card fan__card--more" style={at(shown.length)}>
            <b>+{more}</b>
            <i />
            <i />
          </span>
        )}
      </div>
    </div>
  )
}

/** The office bearers on a podium: the first stands tallest in the middle, the next two beside them, the rest on lower steps. The steps rise and the faces drop onto them. */
function Podium({ people }: { people: Member[] }) {
  const shown = people.slice(0, 5)
  const more = people.length - shown.length
  if (!shown.length) return null
  /* left to right: 4th, 2nd, 1st, 3rd, 5th, then the rest */
  const order = [3, 1, 0, 2, 4].filter((r) => r < shown.length)
  const HEIGHT = [58, 44, 34, 26, 20]
  const look = (rank: number) => ({ '--h': `${HEIGHT[rank]}px`, '--d': rank }) as CSSProperties
  return (
    <div className="podium" aria-hidden>
      {order.map((rank) => {
        const p = shown[rank]
        return (
          <span className="podium__col" data-rank={rank} key={p.id} style={look(rank)}>
            <Avatar name={p.name} photo={p.photo} size={34} />
            <i className="podium__step" />
          </span>
        )
      })}
      {more > 0 && (
        <span className="podium__col" data-rank="more" style={look(4)}>
          <span className="faces__more">+{more}</span>
          <i className="podium__step" />
        </span>
      )}
    </div>
  )
}

/** One shortcut in the Control Panel. */
function ControlCard({ i, to, icon, tone, title, sub, onPick }: { i: number; to: string; icon: ComponentType<LucideProps>; tone: Tone; title: string; sub: string; onPick: () => void }) {
  return (
    <Link to={to} className="ctrl__card" onClick={onPick} style={{ '--i': i } as CSSProperties}>
      <Glyph icon={icon} tone={tone} size={38} />
      <span>
        <b>{title}</b>
        <small>{sub}</small>
      </span>
    </Link>
  )
}

/** The attendance QR code on a coordinator's screen. Only an offline meeting that has not ended gets one. */
function AttendanceQrDialog({ chapterId, onClose }: { chapterId: string; onClose: () => void }) {
  const db = useDB()
  const now = useNow(15_000)

  /* members scan on their own phones, so keep reading while the code is on screen to keep the count live */
  useEffect(() => {
    void syncWithBackend()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void syncWithBackend()
    }, 10_000)
    return () => window.clearInterval(timer)
  }, [])

  const meeting = currentMeeting(
    db.meetings.filter((m) => m.chapterId === chapterId && m.mode === 'offline' && phaseOf(m, now) !== 'ended'),
    now,
  )
  const opensAt = meeting ? windowOf(meeting).opensAt : 0

  return (
    <div className="scan" role="dialog" aria-modal="true" aria-label="Attendance QR Code" onClick={onClose}>
      <div className="scan__card" style={{ maxWidth: 480, padding: '24px 20px' }} onClick={(e) => e.stopPropagation()}>
        <div className="scan__head" style={{ marginBottom: 12 }}>
          <h2>
            <QrCodeIcon size={20} /> Attendance QR Code
          </h2>
          <button type="button" className="scan__x" onClick={onClose} aria-label="Close QR display">
            <X size={18} />
          </button>
        </div>
        {meeting && phaseOf(meeting, now) === 'open' ? (
          <CoordinatorQr
            meeting={meeting}
            marked={db.attendance.filter((a) => a.meetingId === meeting.id).length}
            total={db.members.filter((m) => m.chapterId === chapterId && m.loginEnabled !== false).length}
            compact
            showMeeting
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            {meeting ? (
              <>
                <MeetingBrief meeting={meeting} />
                <p style={{ color: 'var(--ink-mute)', fontSize: 14, marginTop: 10 }}>
                  The QR code opens at {fmtTime(new Date(opensAt).toISOString())}, {OPENS_BEFORE_MIN} minutes before the meeting.
                </p>
              </>
            ) : (
              <p style={{ color: 'var(--ink-mute)', fontSize: 14 }}>No upcoming offline meeting for your chapter. The QR code appears when one is created.</p>
            )}
            <Link to="/meetings" className="btn btn--primary" style={{ marginTop: 14 }} onClick={onClose}>
              Go to Meetings
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
