import { useState, useEffect } from 'react'
import {
  MapPin, Zap, Plane, Moon, Coffee, Clock, Wind, Flame,
  ChevronRight, TrendingUp, Calendar, CheckCircle2, RefreshCw,
  Heart, Droplets, Minus, Plus, UtensilsCrossed, Navigation, AlertTriangle,
} from 'lucide-react'
import axios from 'axios'

const SCENARIOS = [
  { id: 'airport', icon: Plane, label: 'At the airport', message: "I'm at the airport and need to eat. What should I look for and avoid? About 20 minutes before boarding." },
  { id: 'late-night', icon: Moon, label: 'Late night shift', message: "It's late and I'm still working. Need to eat but also eventually sleep. What should I have?" },
  { id: 'post-red-eye', icon: Coffee, label: 'Post red-eye', message: "Just landed from an overnight flight. Exhausted. What should I eat and drink to bounce back?" },
  { id: 'deadline', icon: Flame, label: 'On deadline', message: "On deadline, need to stay sharp for 4-5 hours. What should I eat or drink right now?" },
  { id: 'between', icon: Wind, label: 'Between stories', message: "Real downtime between assignments. What should I focus on for my health right now?" },
  { id: 'quick-break', icon: Clock, label: '10-min break', message: "Only 10 minutes. What's the single best thing I can eat or drink to keep energy up?" },
]

const ENERGY = ['Exhausted', 'Tired', 'Normal', 'Good', 'Sharp']

function getTip(hour, profile) {
  const g = profile?.healthGoals || [], c = profile?.caffeineHabit || ''
  if (hour < 7) return c === 'heavy' ? "Hydrate before caffeine — cortisol is peaking naturally. Water first, delay that first cup 90 min." : "Hydrate before caffeine — cortisol peaks after sleep. Water first, coffee in 90 minutes."
  if (hour < 10) return g.includes('Mental clarity') ? 'Brain fuel: eggs + avocado or Greek yogurt with walnuts. Omega-3s fire up your prefrontal cortex.' : 'Start with protein, not carbs. Eggs, yogurt, or nuts stabilize blood sugar for hours.'
  if (hour < 13) return "Pre-lunch dip hits around 11:30. A handful of mixed nuts now prevents bad lunch decisions."
  if (hour < 15) return "Cognitive performance lunch: salmon over sandwich. Omega-3s and B12 are your brain's best fuel."
  if (hour < 17) return (c === 'heavy' || g.includes('Reduce caffeine')) ? "Afternoon slump? Water + a short walk instead of coffee. Caffeine after 2pm wrecks tonight's sleep." : "Afternoon slump? 16oz water before coffee. Dehydration mimics fatigue almost perfectly."
  if (hour < 20) return g.includes('Better sleep') ? 'Eat now if you can — 3+ hours before bed. Magnesium-rich foods set up better sleep.' : "Evening meal: eat 2+ hours before wind-down to protect sleep quality."
  if (hour < 23) return "Late eating: protein + fat, skip the carb spike. Carbs this late disrupt sleep architecture."
  return "After midnight: your gut is shutting down. Small handful of nuts — not a full meal."
}

function getStreak(checkins) {
  if (!checkins?.length) return 0
  let s = 0, d = new Date()
  for (const c of [...checkins].sort((a, b) => b.date.localeCompare(a.date))) {
    if (c.date === d.toISOString().split('T')[0]) { s++; d.setDate(d.getDate() - 1) } else break
  }
  return s
}

function getJetLag(log, home) {
  if (!log || log.length < 2 || !home) return null
  const latest = log[log.length - 1], prev = log[log.length - 2]
  const days = Math.floor((new Date() - new Date(latest.date)) / 86400000)
  if (days > 3 || latest.timezone === prev.timezone) return null
  return { from: prev.city, to: latest.city, fromTz: prev.timezone, toTz: latest.timezone, days }
}

function fmtTime(iso) {
  if (!iso?.includes('T')) return 'All day'
  try { return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) } catch { return '' }
}

function untilTime(iso) {
  if (!iso?.includes('T')) return ''
  try {
    const m = Math.round((new Date(iso) - new Date()) / 60000)
    return m < 0 ? 'now' : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`
  } catch { return '' }
}

export default function Dashboard({ context, setContext, onScenario, profile, onCheckin, darkMode, calendarConnected, calendarEvents, onCalendarRefresh, apiBase, todayWater, addWater, removeWater, todayMeals, addMeal }) {
  const [now, setNow] = useState(new Date())
  const [showCheckin, setShowCheckin] = useState(false)
  const [cd, setCd] = useState({ energy: '', sleepHours: '', mealQuality: '', hydration: '', notes: '' })
  const [insight, setInsight] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [mealInput, setMealInput] = useState('')
  const [showMeal, setShowMeal] = useState(false)

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t) }, [])

  const h = now.getHours(), name = profile?.name
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const tip = getTip(h, profile)
  const streak = getStreak(profile?.weeklyCheckins)
  const checked = profile?.weeklyCheckins?.some((c) => c.date === new Date().toISOString().split('T')[0])
  const jet = getJetLag(profile?.travelLog, profile?.homeBase)

  // Style tokens
  const c = darkMode
    ? { card: 'bg-warm-800 border-warm-700', text: 'text-warm-100', sub: 'text-warm-400', muted: 'text-warm-500', input: 'bg-warm-700 border-warm-600 text-warm-100 placeholder-warm-500', divider: 'border-warm-700', hover: 'hover:bg-warm-700' }
    : { card: 'bg-white border-warm-200', text: 'text-warm-900', sub: 'text-warm-500', muted: 'text-warm-400', input: 'bg-warm-50 border-warm-200 text-warm-800 placeholder-warm-300', divider: 'border-warm-100', hover: 'hover:bg-warm-50' }
  const pill = (active) => active ? 'bg-sage-600 text-white' : darkMode ? 'bg-warm-700 text-warm-400' : 'bg-warm-50 text-warm-500'

  const submitCheckin = async () => {
    setLoading(true); onCheckin(cd)
    try { const r = await axios.post(`${apiBase}/api/checkin-insight`, { profile, checkin: cd }); setInsight(r.data.insight) }
    catch { setInsight("Logged. Couldn't generate insight right now — data is saved.") }
    finally { setLoading(false) }
  }

  return (
    <div className="overflow-y-auto h-[calc(100vh-130px)] px-5 py-5 space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between animate-fade-in">
        <div>
          <h1 className={`font-display text-[22px] font-bold ${c.text}`}>{greet}{name ? `, ${name}` : ''}.</h1>
          <p className={`text-[13px] mt-0.5 ${c.muted}`}>{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="text-right mt-0.5">
          <p className={`text-base font-semibold tabular-nums ${c.text}`}>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          <p className={`text-[10px] ${c.muted}`}>{Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ')}</p>
        </div>
      </div>

      {/* Jet lag */}
      {jet && (
        <div className={`border rounded-xl p-4 animate-slide-up ${darkMode ? 'bg-amber-950/30 border-amber-800/40' : 'bg-amber-50/80 border-amber-200/60'}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className={`text-xs font-semibold ${darkMode ? 'text-amber-300' : 'text-amber-800'}`}>
                {jet.from} → {jet.to} · {jet.days === 0 ? 'Today' : `${jet.days}d ago`}
              </p>
              <p className={`text-xs mt-1 leading-relaxed ${darkMode ? 'text-amber-200/70' : 'text-amber-700/80'}`}>
                Prioritize hydration, avoid heavy meals, get sunlight to reset your clock.
              </p>
              <button onClick={() => onScenario(`I traveled from ${jet.from} (${jet.fromTz}) to ${jet.to} (${jet.toTz}) ${jet.days === 0 ? 'today' : jet.days + ' days ago'}. Give me a jet lag recovery plan — food, sleep, caffeine timing.`)}
                className="text-[11px] text-amber-600 font-medium mt-1.5 hover:underline">Full recovery plan →</button>
            </div>
          </div>
        </div>
      )}

      {/* Trackers */}
      <div className="flex gap-3">
        <div className={`flex-1 border rounded-xl p-3.5 ${c.card}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Droplets size={13} className={todayWater >= 8 ? 'text-blue-500' : 'text-warm-300'} />
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${c.muted}`}>Water</span>
            </div>
            <div className="flex gap-1">
              <button onClick={removeWater} className={`w-6 h-6 rounded-md flex items-center justify-center text-xs transition-colors ${darkMode ? 'bg-warm-700 text-warm-400' : 'bg-warm-100 text-warm-400'}`}><Minus size={10} /></button>
              <button onClick={addWater} className="w-6 h-6 rounded-md bg-blue-500 text-white flex items-center justify-center text-xs transition-colors hover:bg-blue-600"><Plus size={10} /></button>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-bold tabular-nums ${c.text}`}>{todayWater}</span>
            <span className={`text-[11px] ${c.muted}`}>/ 8 glasses</span>
          </div>
          <div className="flex gap-[3px] mt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < todayWater ? 'bg-blue-400' : darkMode ? 'bg-warm-700' : 'bg-warm-100'}`} />
            ))}
          </div>
        </div>

        <div className={`flex-1 border rounded-xl p-3.5 ${c.card}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <UtensilsCrossed size={13} className="text-sage-500" />
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${c.muted}`}>Meals</span>
            </div>
            <button onClick={() => setShowMeal(!showMeal)} className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${darkMode ? 'bg-warm-700 text-warm-400 hover:bg-warm-600' : 'bg-warm-100 text-warm-400 hover:bg-warm-200'}`}><Plus size={10} /></button>
          </div>
          {todayMeals.length > 0 ? (
            <div className="space-y-1">
              {todayMeals.slice(-3).map((m, i) => (
                <div key={i} className="flex gap-2 items-baseline">
                  <span className={`text-[10px] tabular-nums ${c.muted}`}>{m.time}</span>
                  <span className={`text-xs truncate ${c.sub}`}>{m.text}</span>
                </div>
              ))}
            </div>
          ) : <p className={`text-xs ${c.muted}`}>Nothing logged</p>}
        </div>
      </div>

      {showMeal && (
        <div className={`border rounded-lg p-2.5 flex gap-2 animate-slide-down ${c.card}`}>
          <input type="text" value={mealInput} onChange={(e) => setMealInput(e.target.value)}
            placeholder="What did you eat?" onKeyDown={(e) => { if (e.key === 'Enter' && mealInput.trim()) { addMeal(mealInput.trim()); setMealInput(''); setShowMeal(false) } }}
            className={`flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:border-sage-400 transition-colors ${c.input}`} autoFocus />
          <button onClick={() => { if (mealInput.trim()) { addMeal(mealInput.trim()); setMealInput(''); setShowMeal(false) } }}
            className="px-3 py-2 bg-sage-600 text-white text-xs font-medium rounded-lg hover:bg-sage-700 transition-colors">Log</button>
        </div>
      )}

      {/* Check-in */}
      {!checked && !showCheckin && !insight && (
        <button onClick={() => setShowCheckin(true)} className={`w-full border rounded-xl p-4 text-left transition-all hover:shadow-sm group ${c.card}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart size={16} className="text-sage-500" />
              <div>
                <p className={`text-sm font-medium ${c.text}`}>Daily check-in</p>
                <p className={`text-[11px] ${c.muted}`}>30 sec — personalizes your advice</p>
              </div>
            </div>
            <ChevronRight size={14} className={`${c.muted} group-hover:translate-x-0.5 transition-transform`} />
          </div>
          {streak > 1 && <p className={`text-[11px] mt-2 font-medium ${darkMode ? 'text-terra-400' : 'text-terra-500'}`}>{streak} day streak</p>}
        </button>
      )}

      {showCheckin && !insight && (
        <div className={`border rounded-xl p-4 space-y-4 animate-slide-down ${c.card}`}>
          <p className="text-[10px] font-semibold text-sage-600 uppercase tracking-wider">Check-in</p>
          {[
            { label: 'Energy', field: 'energy', opts: ['1','2','3','4','5'] },
            { label: 'Sleep', field: 'sleepHours', opts: ['<4','4-5','6-7','7-8','8+'] },
            { label: 'Meals', field: 'mealQuality', opts: ['Poor','Okay','Good','Great'] },
            { label: 'Water', field: 'hydration', opts: ['Barely','Some','Decent','Good'] },
          ].map(({ label, field, opts }) => (
            <div key={field}>
              <p className={`text-[11px] mb-1.5 font-medium ${c.sub}`}>{label}</p>
              <div className="flex gap-1.5">
                {opts.map((v) => (
                  <button key={v} onClick={() => setCd((p) => ({ ...p, [field]: v }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${pill(cd[field] === v)}`}>{v}</button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowCheckin(false)} className={`px-4 py-2 text-xs rounded-lg font-medium ${pill(false)}`}>Skip</button>
            <button onClick={submitCheckin} disabled={!cd.energy || loading}
              className="flex-1 py-2 bg-sage-600 hover:bg-sage-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all">{loading ? 'Saving...' : 'Done'}</button>
          </div>
        </div>
      )}

      {insight && (
        <div className={`border rounded-xl p-4 animate-slide-up ${darkMode ? 'bg-sage-900/20 border-sage-800' : 'bg-sage-50 border-sage-200'}`}>
          <p className="text-[10px] font-semibold text-sage-600 uppercase tracking-wider mb-1.5">Checked in {streak > 0 && `· ${streak + 1}d streak`}</p>
          <p className={`text-sm leading-relaxed ${darkMode ? 'text-sage-200' : 'text-warm-700'}`}>{insight}</p>
        </div>
      )}

      {/* Stats row */}
      {checked && streak > 0 && (
        <div className="flex gap-3 animate-fade-in">
          <div className={`flex-1 border rounded-lg px-3 py-2.5 flex items-center gap-2 ${c.card}`}>
            <TrendingUp size={13} className="text-terra-500" />
            <span className={`text-xs ${c.sub}`}><span className={`font-semibold ${c.text}`}>{streak}</span> day streak</span>
          </div>
          <div className={`flex-1 border rounded-lg px-3 py-2.5 flex items-center gap-2 ${c.card}`}>
            <Heart size={13} className="text-sage-500" />
            <span className={`text-xs ${c.sub}`}><span className={`font-semibold ${c.text}`}>{profile.weeklyCheckins.length}</span> check-ins</span>
          </div>
        </div>
      )}

      {/* Context */}
      <div className={`border rounded-xl p-4 ${c.card}`}>
        <div className="flex items-center gap-2.5 mb-3">
          <MapPin size={14} className="text-sage-500 flex-shrink-0" />
          <input type="text" placeholder="Where are you right now?"
            value={context.location} onChange={(e) => setContext((p) => ({ ...p, location: e.target.value }))}
            className={`flex-1 bg-transparent text-sm outline-none ${darkMode ? 'text-warm-100 placeholder-warm-600' : 'text-warm-800 placeholder-warm-300'}`} />
        </div>
        {context.location && (
          <button onClick={() => onScenario(`I'm at ${context.location}. What are the best healthy food options within walking distance? Be specific.`)}
            className={`w-full mb-3 py-2 border border-dashed rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${darkMode ? 'border-sage-700 text-sage-400 hover:border-sage-500' : 'border-sage-300 text-sage-600 hover:bg-sage-50'}`}>
            <Navigation size={11} /> Healthy options near {context.location}
          </button>
        )}
        <div className={`border-t pt-3 ${c.divider}`}>
          <p className={`text-[10px] mb-2 font-medium ${c.muted}`}>Energy</p>
          <div className="flex gap-1.5">
            {ENERGY.map((e, i) => {
              const id = e.toLowerCase()
              return <button key={id} onClick={() => setContext((p) => ({ ...p, energyLevel: id }))}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${pill(context.energyLevel === id)}`}>{e}</button>
            })}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className={`border rounded-xl p-4 ${c.card}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${c.muted}`}>Schedule</span>
          {calendarConnected && (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={11} className="text-sage-500" />
              <button onClick={async () => { setRefreshing(true); await onCalendarRefresh(); setRefreshing(false) }} className={`${c.muted} hover:text-sage-600 transition-colors`}>
                <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          )}
        </div>
        {calendarConnected && calendarEvents ? (
          calendarEvents.length === 0
            ? <p className={`text-xs ${c.muted}`}>Clear schedule for the next 14 hours.</p>
            : <div>{calendarEvents.map((ev, i) => {
                const u = untilTime(ev.start)
                return (
                  <div key={i} className={`flex gap-3 py-2.5 ${i > 0 ? `border-t ${c.divider}` : ''}`}>
                    <div className="text-right w-12 flex-shrink-0">
                      <p className={`text-xs tabular-nums ${c.sub}`}>{fmtTime(ev.start)}</p>
                      {u && <p className={`text-[10px] tabular-nums ${i === 0 ? 'text-sage-600 font-medium' : c.muted}`}>{u}</p>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${i === 0 ? `font-medium ${c.text}` : c.sub}`}>{ev.title}</p>
                    </div>
                  </div>
                )
              })}</div>
        ) : (
          <button onClick={() => { window.location.href = `${apiBase}/api/calendar/connect` }}
            className={`w-full py-3 border border-dashed rounded-lg text-xs flex items-center justify-center gap-2 transition-all ${darkMode ? 'border-warm-600 text-warm-500 hover:text-warm-300' : 'border-warm-300 text-warm-400 hover:text-warm-600'}`}>
            <Calendar size={14} /> Connect Google Calendar
          </button>
        )}
      </div>

      {/* Scenarios */}
      <div>
        <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2.5 ${c.muted}`}>Quick scenarios</p>
        <div className="grid grid-cols-3 gap-2">
          {SCENARIOS.map((s) => {
            const I = s.icon
            return (
              <button key={s.id} onClick={() => onScenario(s.message)}
                className={`border rounded-xl p-3 text-center transition-all duration-150 active:scale-[0.96] ${c.card} ${c.hover}`}>
                <I size={16} className="text-sage-500 mx-auto mb-1.5" />
                <span className={`text-[11px] font-medium leading-tight block ${c.sub}`}>{s.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tip */}
      <div className={`border rounded-xl p-4 ${darkMode ? 'bg-sage-900/20 border-sage-800' : 'bg-sage-50/60 border-sage-200/60'}`}>
        <p className="text-[10px] font-semibold text-sage-600 uppercase tracking-wider mb-1.5">Right now</p>
        <p className={`text-[13px] leading-relaxed ${darkMode ? 'text-sage-200' : 'text-warm-700'}`}>{tip}</p>
      </div>

      <div className="h-2" />
    </div>
  )
}
