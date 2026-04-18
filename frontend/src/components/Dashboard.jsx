import { useState, useEffect } from 'react'
import { MapPin, Zap, Plane, Moon, Coffee, Clock, Wind, Flame, ChevronRight, TrendingUp, Calendar, CheckCircle, RefreshCw, Heart, Droplets, Minus, Plus, UtensilsCrossed, Navigation, AlertTriangle } from 'lucide-react'
import axios from 'axios'

const SCENES = [
  { icon: Plane, label: 'Airport', msg: "I'm at the airport and need to eat. What should I look for and avoid? About 20 min before boarding." },
  { icon: Moon, label: 'Late shift', msg: "It's late, still working. Need to eat but also sleep eventually. What should I have?" },
  { icon: Coffee, label: 'Red-eye', msg: "Just landed from an overnight flight. Exhausted. What to eat and drink to bounce back?" },
  { icon: Flame, label: 'Deadline', msg: "On deadline, need to stay sharp 4-5 hours. What should I eat or drink?" },
  { icon: Wind, label: 'Downtime', msg: "Real downtime between assignments. What should I focus on for health?" },
  { icon: Clock, label: '10 min', msg: "Only 10 minutes. Single best thing to eat or drink for energy?" },
]

function tip(h, p) {
  const g = p?.healthGoals || [], c = p?.caffeineHabit || ''
  if (h < 7) return c === 'heavy' ? "Delay caffeine 90 min — cortisol is already peaking. Water first." : "Water before coffee. Cortisol peaks naturally after sleep."
  if (h < 10) return g.includes('Mental clarity') ? 'Eggs + avocado or yogurt with walnuts. Omega-3s activate your prefrontal cortex.' : 'Protein first, not carbs. Stabilizes blood sugar for hours.'
  if (h < 13) return "Pre-lunch dip hits around 11:30. Handful of nuts now prevents bad decisions later."
  if (h < 15) return "Salmon over sandwich for lunch. Omega-3s and B12 are cognitive fuel."
  if (h < 17) return (c === 'heavy' || g.includes('Reduce caffeine')) ? "Water + walk instead of coffee. Caffeine after 2pm damages tonight's sleep." : "16oz water before reaching for coffee. Dehydration mimics fatigue."
  if (h < 20) return g.includes('Better sleep') ? 'Eat now — 3+ hours before bed. Magnesium-rich foods prep better sleep.' : "Eat 2+ hours before wind-down to protect sleep quality."
  if (h < 23) return "Protein + fat only. Carbs this late disrupt sleep architecture."
  return "Gut is shutting down. Small handful of nuts max."
}

function streak(ck) {
  if (!ck?.length) return 0
  let s = 0, d = new Date()
  for (const c of [...ck].sort((a, b) => b.date.localeCompare(a.date))) {
    if (c.date === d.toISOString().split('T')[0]) { s++; d.setDate(d.getDate() - 1) } else break
  }
  return s
}

function jetLag(log) {
  if (!log || log.length < 2) return null
  const a = log[log.length - 1], b = log[log.length - 2]
  const d = Math.floor((new Date() - new Date(a.date)) / 86400000)
  if (d > 3 || a.timezone === b.timezone) return null
  return { from: b.city, to: a.city, ftz: b.timezone, ttz: a.timezone, d }
}

function evTime(iso) { if (!iso?.includes('T')) return ''; try { return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) } catch { return '' } }
function evUntil(iso) { if (!iso?.includes('T')) return ''; try { const m = Math.round((new Date(iso) - new Date()) / 60000); return m < 0 ? 'now' : m < 60 ? `${m}m` : `${~~(m/60)}h${m%60>0?` ${m%60}m`:''}` } catch { return '' } }

export default function Dashboard({ ctx, setCtx, go, profile, onCheckin, dark, calOk, calEv, fetchCal, api, water, addW, subW, meals, logMeal }) {
  const [now, setNow] = useState(new Date())
  const [showCk, setShowCk] = useState(false)
  const [ck, setCk] = useState({ energy: '', sleepHours: '', mealQuality: '', hydration: '' })
  const [insight, setInsight] = useState(null)
  const [ckLoad, setCkLoad] = useState(false)
  const [mealIn, setMealIn] = useState('')
  const [showMeal, setShowMeal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t) }, [])

  const h = now.getHours(), nm = profile?.name
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const st = streak(profile?.weeklyCheckins)
  const done = profile?.weeklyCheckins?.some(c => c.date === new Date().toISOString().split('T')[0])
  const jl = jetLag(profile?.travelLog)
  const t1 = dark ? 'text-white' : 'text-neutral-900'
  const t2 = dark ? 'text-neutral-400' : 'text-neutral-500'
  const t3 = dark ? 'text-neutral-500' : 'text-neutral-400'
  const div = dark ? 'border-neutral-800' : 'border-neutral-100'

  const submitCk = async () => {
    setCkLoad(true); onCheckin(ck)
    try { const r = await axios.post(`${api}/api/checkin-insight`, { profile, checkin: ck }); setInsight(r.data.insight) }
    catch { setInsight("Logged. Insight unavailable — data saved.") }
    finally { setCkLoad(false) }
  }

  return (
    <div className="overflow-y-auto h-[calc(100vh-120px)] px-4 py-4 space-y-3">

      {/* Header */}
      <div className="flex items-start justify-between animate-fade-in px-1">
        <div>
          <h1 className={`text-xl font-bold ${t1}`}>{greet}{nm ? `, ${nm}` : ''}</h1>
          <p className={`text-xs mt-0.5 ${t3}`}>{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-semibold tabular-nums ${t1}`}>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          <p className={`text-[9px] ${t3}`}>{Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ')}</p>
        </div>
      </div>

      {/* Jet lag */}
      {jl && (
        <div className={`card-sm p-3.5 animate-slide-up ${dark ? 'bg-amber-950/40 border-amber-900/50' : 'bg-amber-50 border-amber-100'}`}>
          <div className="flex gap-2.5">
            <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className={`text-xs font-semibold ${dark ? 'text-amber-300' : 'text-amber-800'}`}>{jl.from} → {jl.to}</p>
              <p className={`text-[11px] mt-0.5 ${dark ? 'text-amber-400/70' : 'text-amber-700/70'}`}>Hydrate, avoid heavy meals, get sunlight.</p>
              <button onClick={() => go(`Traveled ${jl.from} (${jl.ftz}) → ${jl.to} (${jl.ttz}) ${jl.d === 0 ? 'today' : jl.d + 'd ago'}. Jet lag recovery plan — food, sleep, caffeine.`)}
                className="text-[11px] text-amber-600 font-medium mt-1 hover:underline">Recovery plan →</button>
            </div>
          </div>
        </div>
      )}

      {/* Trackers */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="card-sm p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Droplets size={12} className={water >= 8 ? 'text-blue-500' : 'text-neutral-300'} />
              <span className="label">Water</span>
            </div>
            <div className="flex gap-1">
              <button onClick={subW} className="btn-ghost w-5 h-5 rounded flex items-center justify-center"><Minus size={9} /></button>
              <button onClick={addW} className="w-5 h-5 rounded bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors"><Plus size={9} /></button>
            </div>
          </div>
          <p className={`text-lg font-bold tabular-nums ${t1}`}>{water}<span className={`text-xs font-normal ml-0.5 ${t3}`}>/8</span></p>
          <div className="flex gap-[2px] mt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`h-[3px] flex-1 rounded-full transition-all duration-300 ${i < water ? 'bg-blue-400' : dark ? 'bg-neutral-800' : 'bg-neutral-100'}`} />
            ))}
          </div>
        </div>

        <div className="card-sm p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <UtensilsCrossed size={12} className="text-emerald-500" />
              <span className="label">Meals</span>
            </div>
            <button onClick={() => setShowMeal(!showMeal)} className="btn-ghost w-5 h-5 rounded flex items-center justify-center"><Plus size={9} /></button>
          </div>
          {meals.length > 0 ? meals.slice(-2).map((m, i) => (
            <p key={i} className={`text-[11px] truncate ${t2}`}><span className={`${t3} tabular-nums`}>{m.time}</span> {m.text}</p>
          )) : <p className={`text-[11px] ${t3}`}>Nothing logged</p>}
        </div>
      </div>

      {showMeal && (
        <div className="card-sm p-2.5 flex gap-2 animate-slide-down">
          <input value={mealIn} onChange={e => setMealIn(e.target.value)} placeholder="What did you eat?"
            onKeyDown={e => { if (e.key === 'Enter' && mealIn.trim()) { logMeal(mealIn.trim()); setMealIn(''); setShowMeal(false) } }}
            className="input flex-1 text-xs py-2" autoFocus />
          <button onClick={() => { if (mealIn.trim()) { logMeal(mealIn.trim()); setMealIn(''); setShowMeal(false) } }}
            className="btn-primary px-3 py-2 text-xs">Log</button>
        </div>
      )}

      {/* Check-in */}
      {!done && !showCk && !insight && (
        <button onClick={() => setShowCk(true)} className="card w-full p-4 text-left group hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart size={15} className="text-emerald-500" />
              <div>
                <p className={`text-sm font-medium ${t1}`}>Daily check-in</p>
                <p className={`text-[11px] ${t3}`}>30 sec — personalizes advice</p>
              </div>
            </div>
            <ChevronRight size={14} className={`${t3} group-hover:translate-x-0.5 transition-transform`} />
          </div>
          {st > 1 && <p className={`text-[11px] mt-2 font-medium text-amber-600`}>{st} day streak</p>}
        </button>
      )}

      {showCk && !insight && (
        <div className="card p-4 space-y-3 animate-slide-down">
          <p className="label text-emerald-600">Check-in</p>
          {[
            { l: 'Energy', f: 'energy', o: ['1','2','3','4','5'] },
            { l: 'Sleep', f: 'sleepHours', o: ['<4','4-5','6-7','7-8','8+'] },
            { l: 'Meals', f: 'mealQuality', o: ['Poor','Okay','Good','Great'] },
            { l: 'Water', f: 'hydration', o: ['Low','Some','Good','Great'] },
          ].map(({ l, f, o }) => (
            <div key={f}>
              <p className={`text-[11px] mb-1 font-medium ${t2}`}>{l}</p>
              <div className="flex gap-1.5">
                {o.map(v => <button key={v} onClick={() => setCk(p => ({ ...p, [f]: v }))} className={`pill flex-1 ${ck[f] === v ? 'pill-active' : 'pill-inactive'}`}>{v}</button>)}
              </div>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowCk(false)} className="btn-ghost px-4 py-2 text-xs">Skip</button>
            <button onClick={submitCk} disabled={!ck.energy || ckLoad} className="btn-primary flex-1 py-2 text-xs disabled:opacity-40">{ckLoad ? 'Saving...' : 'Done'}</button>
          </div>
        </div>
      )}

      {insight && (
        <div className={`card-sm p-4 animate-slide-up ${dark ? 'bg-emerald-950/30 border-emerald-900/40' : 'bg-emerald-50/80 border-emerald-100'}`}>
          <p className="label text-emerald-600 mb-1">Checked in{st > 0 ? ` · ${st+1}d streak` : ''}</p>
          <p className={`text-[13px] leading-relaxed ${dark ? 'text-emerald-200' : 'text-neutral-700'}`}>{insight}</p>
        </div>
      )}

      {done && st > 0 && (
        <div className="grid grid-cols-2 gap-2.5 animate-fade-in">
          <div className="card-sm px-3 py-2.5 flex items-center gap-2">
            <TrendingUp size={12} className="text-amber-500" />
            <span className={`text-xs ${t2}`}><span className={`font-semibold ${t1}`}>{st}</span> day streak</span>
          </div>
          <div className="card-sm px-3 py-2.5 flex items-center gap-2">
            <Heart size={12} className="text-emerald-500" />
            <span className={`text-xs ${t2}`}><span className={`font-semibold ${t1}`}>{profile.weeklyCheckins.length}</span> check-ins</span>
          </div>
        </div>
      )}

      {/* Context */}
      <div className="card p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <MapPin size={13} className="text-emerald-500 flex-shrink-0" />
          <input type="text" placeholder="Where are you?" value={ctx.location} onChange={e => setCtx(p => ({ ...p, location: e.target.value }))}
            className={`flex-1 bg-transparent text-sm outline-none ${dark ? 'text-white placeholder-neutral-600' : 'text-neutral-900 placeholder-neutral-300'}`} />
        </div>
        {ctx.location && (
          <button onClick={() => go(`I'm at ${ctx.location}. Best healthy food options within walking distance? Be specific.`)}
            className={`w-full mb-3 py-2 border border-dashed rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${dark ? 'border-emerald-800 text-emerald-400 hover:border-emerald-600' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
            <Navigation size={10} /> Healthy options near {ctx.location}
          </button>
        )}
        <div className={`border-t pt-3 ${div}`}>
          <p className={`label mb-2`}>Energy</p>
          <div className="flex gap-1.5">
            {['Exhausted','Tired','Normal','Good','Sharp'].map(e => {
              const id = e.toLowerCase()
              return <button key={id} onClick={() => setCtx(p => ({ ...p, energyLevel: id }))} className={`pill flex-1 ${ctx.energyLevel === id ? 'pill-active' : 'pill-inactive'}`}>{e}</button>
            })}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="label">Schedule</span>
          {calOk && (
            <div className="flex items-center gap-1.5">
              <CheckCircle size={10} className="text-emerald-500" />
              <button onClick={async () => { setRefreshing(true); await fetchCal(); setRefreshing(false) }} className={`${t3} hover:text-emerald-600 transition-colors`}>
                <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          )}
        </div>
        {calOk && calEv ? (
          calEv.length === 0 ? <p className={`text-xs ${t3}`}>Clear for the next 14 hours.</p>
          : <div>{calEv.map((ev, i) => {
              const u = evUntil(ev.start)
              return (
                <div key={i} className={`flex gap-3 py-2 ${i > 0 ? `border-t ${div}` : ''}`}>
                  <div className="w-11 text-right flex-shrink-0">
                    <p className={`text-[11px] tabular-nums ${t2}`}>{evTime(ev.start)}</p>
                    {u && <p className={`text-[10px] tabular-nums ${i === 0 ? 'text-emerald-600 font-medium' : t3}`}>{u}</p>}
                  </div>
                  <p className={`text-sm truncate ${i === 0 ? `font-medium ${t1}` : t2}`}>{ev.title}</p>
                </div>
              )
            })}</div>
        ) : (
          <button onClick={() => { window.location.href = `${api}/api/calendar/connect` }}
            className={`w-full py-3 border border-dashed rounded-lg text-xs flex items-center justify-center gap-2 transition-all ${dark ? 'border-neutral-700 text-neutral-500 hover:text-neutral-300' : 'border-neutral-300 text-neutral-400 hover:text-neutral-600'}`}>
            <Calendar size={13} /> Connect Google Calendar
          </button>
        )}
      </div>

      {/* Scenarios */}
      <div>
        <p className="label mb-2 px-1">Quick scenarios</p>
        <div className="grid grid-cols-3 gap-2">
          {SCENES.map((s, i) => (
            <button key={i} onClick={() => go(s.msg)} className="card-sm p-3 text-center hover:shadow-sm transition-all active:scale-[0.96]">
              <s.icon size={15} className="text-emerald-500 mx-auto mb-1.5" />
              <span className={`text-[11px] font-medium ${t2}`}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div className={`card-sm p-4 ${dark ? 'bg-emerald-950/20 border-emerald-900/30' : 'bg-emerald-50/50 border-emerald-100/60'}`}>
        <p className="label text-emerald-600 mb-1">Right now</p>
        <p className={`text-[13px] leading-relaxed ${dark ? 'text-emerald-200/80' : 'text-neutral-600'}`}>{tip(h, profile)}</p>
      </div>

      <div className="h-2" />
    </div>
  )
}
