import { useState, useEffect } from 'react'
import {
  MapPin, Zap, Plane, Moon, Coffee, Clock, Wind, Flame,
  ChevronRight, TrendingUp, Calendar, CheckCircle2, RefreshCw,
  Heart, Droplets, Minus, UtensilsCrossed, Navigation, AlertCircle,
} from 'lucide-react'
import axios from 'axios'

const SCENARIOS = [
  { id: 'airport', icon: Plane, label: 'At the airport', color: 'text-blue-600', bg: 'bg-blue-50', message: "I'm at the airport and need to eat. What should I look for and what should I avoid? I have about 20 minutes before boarding." },
  { id: 'late-night', icon: Moon, label: 'Late night shift', color: 'text-violet-600', bg: 'bg-violet-50', message: "It's late and I'm still working. I need to eat something but also need to eventually sleep. What should I have right now?" },
  { id: 'post-red-eye', icon: Coffee, label: 'Post red-eye', color: 'text-amber-700', bg: 'bg-amber-50', message: "I just landed from an overnight flight. I'm exhausted. What should I eat and drink to bounce back fast?" },
  { id: 'deadline', icon: Flame, label: 'On deadline', color: 'text-red-600', bg: 'bg-red-50', message: "I'm on deadline and need to stay sharp for the next 4-5 hours. What should I eat or drink right now?" },
  { id: 'between', icon: Wind, label: 'Between stories', color: 'text-sage-700', bg: 'bg-sage-50', message: "I have real downtime between assignments. What should I focus on for my health right now?" },
  { id: 'quick-break', icon: Clock, label: '10-min break', color: 'text-cyan-700', bg: 'bg-cyan-50', message: "I only have 10 minutes. What's the single best thing I can eat or drink to keep my energy up?" },
]

const ENERGY_LEVELS = [
  { id: 'exhausted', label: 'Exhausted' },
  { id: 'tired', label: 'Tired' },
  { id: 'normal', label: 'Normal' },
  { id: 'good', label: 'Good' },
  { id: 'energized', label: 'Sharp' },
]

function getTimeBasedTip(hour, profile) {
  const goals = profile?.healthGoals || []
  const caffeine = profile?.caffeineHabit || ''
  if (hour < 7) return caffeine === 'heavy'
    ? { tip: "Hydrate before caffeine — your cortisol is peaking naturally. Water first, delay that first cup by 90 min.", icon: '💧' }
    : { tip: "Hydrate before caffeine — cortisol is already peaking after sleep. Water first, coffee in 90 minutes.", icon: '💧' }
  if (hour < 10) return goals.includes('Mental clarity')
    ? { tip: 'Brain fuel morning: eggs + avocado or Greek yogurt with walnuts. Omega-3s and choline fire up your prefrontal cortex.', icon: '🧠' }
    : { tip: 'Start with protein, not carbs. Eggs, Greek yogurt, or nuts stabilize blood sugar for hours.', icon: '🥚' }
  if (hour < 13) return { tip: "Pre-lunch dip hits around 11:30am. A handful of mixed nuts now prevents bad lunch decisions.", icon: '🥜' }
  if (hour < 15) return goals.includes('Gut health')
    ? { tip: 'Lunch pick: salmon or grilled chicken with fermented sides. Your gut microbiome will thank you.', icon: '🐟' }
    : { tip: "Cognitive performance lunch: salmon > sandwich. Omega-3s and B12 are your brain's best fuel.", icon: '🐟' }
  if (hour < 17) return (caffeine === 'heavy' || goals.includes('Reduce caffeine'))
    ? { tip: "Afternoon slump? 16oz water + a short walk instead of another coffee. Caffeine after 2pm wrecks tonight's sleep.", icon: '⚡' }
    : { tip: "Afternoon slump? Try 16oz of water before coffee. Dehydration mimics fatigue almost perfectly.", icon: '⚡' }
  if (hour < 20) return goals.includes('Better sleep')
    ? { tip: 'Eat now if you can — 3+ hours before bed is ideal. Magnesium-rich foods set up better sleep.', icon: '🌙' }
    : { tip: "Evening meal: eat at least 2 hours before wind-down to avoid poor sleep quality.", icon: '🌙' }
  if (hour < 23) return { tip: "Late eating: go protein + fat, skip the carb spike. Carbs this late disrupt sleep.", icon: '🛡️' }
  return { tip: "After midnight: your gut is shutting down. Handful of nuts max — not a full meal.", icon: '🌑' }
}

function getStreakCount(checkins) {
  if (!checkins || checkins.length === 0) return 0
  let streak = 0
  const sorted = [...checkins].sort((a, b) => b.date.localeCompare(a.date))
  const expectedDate = new Date()
  for (const c of sorted) {
    const expected = expectedDate.toISOString().split('T')[0]
    if (c.date === expected) { streak++; expectedDate.setDate(expectedDate.getDate() - 1) }
    else if (c.date < expected) break
  }
  return streak
}

function getJetLagInfo(travelLog, homeBase) {
  if (!travelLog || travelLog.length < 2 || !homeBase) return null
  const latest = travelLog[travelLog.length - 1]
  const prev = travelLog[travelLog.length - 2]
  if (!latest || !prev) return null
  const daysSince = Math.floor((new Date() - new Date(latest.date)) / 86400000)
  if (daysSince > 3) return null
  if (latest.timezone === prev.timezone) return null
  return { from: prev.city, to: latest.city, fromTz: prev.timezone, toTz: latest.timezone, daysSince }
}

function formatEventTime(iso) {
  if (!iso || !iso.includes('T')) return 'All day'
  try { return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) } catch { return '' }
}

function timeUntil(iso) {
  if (!iso || !iso.includes('T')) return ''
  try {
    const diff = Math.round((new Date(iso) - new Date()) / 60000)
    if (diff < 0) return 'now'
    if (diff < 60) return `${diff}m`
    return `${Math.floor(diff / 60)}h ${diff % 60}m`
  } catch { return '' }
}

export default function Dashboard({ context, setContext, onScenario, profile, onCheckin, darkMode, calendarConnected, calendarEvents, onCalendarRefresh, apiBase, todayWater, addWater, removeWater, todayMeals, addMeal }) {
  const [now, setNow] = useState(new Date())
  const [showCheckin, setShowCheckin] = useState(false)
  const [checkinData, setCheckinData] = useState({ energy: '', sleepHours: '', mealQuality: '', hydration: '', notes: '' })
  const [checkinInsight, setCheckinInsight] = useState(null)
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [mealInput, setMealInput] = useState('')
  const [showMealInput, setShowMealInput] = useState(false)

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t) }, [])

  const hour = now.getHours()
  const name = profile?.name || ''
  const greeting = hour < 12 ? `Good morning${name ? ', ' + name : ''}` : hour < 17 ? `Good afternoon${name ? ', ' + name : ''}` : `Good evening${name ? ', ' + name : ''}`
  const { tip, icon } = getTimeBasedTip(hour, profile)
  const streak = getStreakCount(profile?.weeklyCheckins)
  const todayChecked = profile?.weeklyCheckins?.some((c) => c.date === new Date().toISOString().split('T')[0])
  const jetLag = getJetLagInfo(profile?.travelLog, profile?.homeBase)

  const card = darkMode ? 'bg-warm-800 border-warm-700' : 'bg-white border-warm-200'
  const cardShadow = darkMode ? '' : 'shadow-sm'
  const textPrimary = darkMode ? 'text-warm-100' : 'text-warm-900'
  const textSecondary = darkMode ? 'text-warm-400' : 'text-warm-500'
  const textMuted = darkMode ? 'text-warm-500' : 'text-warm-400'
  const inputBg = darkMode ? 'bg-warm-700 border-warm-600 text-warm-100 placeholder-warm-500' : 'bg-warm-50 border-warm-200 text-warm-800 placeholder-warm-300'
  const pillActive = 'bg-sage-600 text-white shadow-md shadow-sage-600/20'
  const pillInactive = darkMode ? 'bg-warm-700 text-warm-400 hover:bg-warm-600' : 'bg-warm-50 text-warm-500 hover:bg-warm-100'

  const submitCheckin = async () => {
    setCheckinLoading(true); onCheckin(checkinData)
    try { const resp = await axios.post(`${apiBase}/api/checkin-insight`, { profile, checkin: checkinData }); setCheckinInsight(resp.data.insight) }
    catch { setCheckinInsight("Logged! Couldn't generate an insight right now, but your data is saved.") }
    finally { setCheckinLoading(false) }
  }

  const handleAddMeal = () => {
    if (!mealInput.trim()) return
    addMeal(mealInput.trim()); setMealInput(''); setShowMealInput(false)
  }

  const nearMePrompt = context.location
    ? `I'm at ${context.location}. What are the best healthy food options within walking distance? Be specific — name types of places and what to order.`
    : "I need to find healthy food near me. What types of places should I look for and what should I order?"

  return (
    <div className={`overflow-y-auto h-[calc(100vh-130px)] px-5 py-4 space-y-5`}>
      {/* Greeting + Time */}
      <div className="animate-fade-in">
        <div className="flex items-start justify-between">
          <h1 className={`font-display text-2xl font-bold ${textPrimary}`}>{greeting}.</h1>
          <div className="text-right flex-shrink-0 mt-1">
            <p className={`text-lg font-semibold tabular-nums leading-tight ${darkMode ? 'text-warm-200' : 'text-warm-800'}`}>
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className={`text-[10px] mt-0.5 ${textMuted}`}>
              {Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        <p className={`text-sm mt-1 ${textMuted}`}>{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Jet Lag Alert */}
      {jetLag && (
        <div className={`border rounded-2xl p-4 animate-slide-up ${darkMode ? 'bg-amber-900/20 border-amber-700/40' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={14} className="text-amber-500" />
            <p className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>Jet lag recovery</p>
          </div>
          <p className={`text-sm leading-relaxed ${darkMode ? 'text-amber-200' : 'text-amber-800'}`}>
            You flew {jetLag.from} → {jetLag.to} {jetLag.daysSince === 0 ? 'today' : `${jetLag.daysSince}d ago`}.
            Prioritize hydration, avoid heavy meals for 24h, and get sunlight exposure to reset your circadian rhythm.
          </p>
          <button onClick={() => onScenario(`I just traveled from ${jetLag.from} (${jetLag.fromTz}) to ${jetLag.to} (${jetLag.toTz}) ${jetLag.daysSince === 0 ? 'today' : jetLag.daysSince + ' days ago'}. Give me a detailed jet lag recovery plan — what to eat, when to sleep, caffeine timing, and how to reset my body clock.`)}
            className="mt-2 text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors">
            Get full recovery plan →
          </button>
        </div>
      )}

      {/* Hydration + Meal Tracker Row */}
      <div className="flex gap-3 animate-slide-up">
        {/* Hydration */}
        <div className={`flex-1 border rounded-2xl p-4 ${card} ${cardShadow}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${textMuted}`}>Water today</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets size={18} className={todayWater >= 8 ? 'text-blue-500' : todayWater >= 4 ? 'text-blue-400' : 'text-warm-300'} />
              <span className={`text-2xl font-bold tabular-nums ${textPrimary}`}>{todayWater}</span>
              <span className={`text-xs ${textMuted}`}>/ 8</span>
            </div>
            <div className="flex gap-1">
              <button onClick={removeWater} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${darkMode ? 'bg-warm-700 text-warm-400 hover:bg-warm-600' : 'bg-warm-100 text-warm-400 hover:bg-warm-200'}`}>
                <Minus size={12} />
              </button>
              <button onClick={addWater} className="w-7 h-7 rounded-lg bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-colors text-sm font-bold">+</button>
            </div>
          </div>
          <div className="flex gap-0.5 mt-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < todayWater ? 'bg-blue-400' : darkMode ? 'bg-warm-700' : 'bg-warm-100'}`} />
            ))}
          </div>
        </div>

        {/* Meals logged */}
        <div className={`flex-1 border rounded-2xl p-4 ${card} ${cardShadow}`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${textMuted}`}>Meals</p>
            <button onClick={() => setShowMealInput(!showMealInput)} className="text-sage-600 hover:text-sage-800 transition-colors">
              <UtensilsCrossed size={14} />
            </button>
          </div>
          {todayMeals.length > 0 ? (
            <div className="space-y-1">
              {todayMeals.slice(-3).map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`text-[10px] ${textMuted} w-12 flex-shrink-0`}>{m.time}</span>
                  <span className={`text-xs truncate ${darkMode ? 'text-warm-300' : 'text-warm-600'}`}>{m.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-xs ${textMuted}`}>No meals logged yet</p>
          )}
        </div>
      </div>

      {/* Meal input */}
      {showMealInput && (
        <div className={`border rounded-xl p-3 flex gap-2 animate-slide-down ${card}`}>
          <input type="text" value={mealInput} onChange={(e) => setMealInput(e.target.value)}
            placeholder="What did you eat? (e.g. airport burrito)"
            onKeyDown={(e) => e.key === 'Enter' && handleAddMeal()}
            className={`flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:border-sage-400 transition-colors ${inputBg}`} />
          <button onClick={handleAddMeal} disabled={!mealInput.trim()}
            className="px-3 py-2 bg-sage-600 hover:bg-sage-700 disabled:bg-warm-200 disabled:text-warm-400 text-white text-sm font-medium rounded-lg transition-all">Log</button>
        </div>
      )}

      {/* Daily Check-in CTA */}
      {!todayChecked && !showCheckin && (
        <button onClick={() => setShowCheckin(true)}
          className={`w-full border rounded-2xl p-5 text-left transition-all hover:shadow-md animate-slide-up group ${card} ${darkMode ? 'hover:border-sage-600' : 'hover:border-sage-300'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-sage-900' : 'bg-sage-50'}`}>
                <Heart size={18} className="text-sage-600" />
              </div>
              <div>
                <p className={`text-sm font-semibold ${darkMode ? 'text-warm-200' : 'text-warm-800'}`}>Daily check-in</p>
                <p className={`text-xs mt-0.5 ${textMuted}`}>30 seconds — helps personalize your advice</p>
              </div>
            </div>
            <ChevronRight size={16} className={`${textMuted} group-hover:text-sage-500 group-hover:translate-x-0.5 transition-all`} />
          </div>
          {streak > 0 && <p className="text-[11px] text-terra-500 mt-3 font-medium">🔥 {streak} day streak</p>}
        </button>
      )}

      {/* Check-in Form */}
      {showCheckin && !checkinInsight && (
        <div className={`border rounded-2xl p-5 space-y-5 animate-slide-down ${card} ${cardShadow}`}>
          <p className="text-xs font-semibold text-sage-600 uppercase tracking-wider">Quick check-in</p>
          {[
            { label: "How's your energy?", field: 'energy', options: [{ v: '1', e: '😩' }, { v: '2', e: '😴' }, { v: '3', e: '😐' }, { v: '4', e: '🙂' }, { v: '5', e: '⚡' }] },
            { label: 'Sleep last night', field: 'sleepHours', options: ['<4', '4-5', '6-7', '7-8', '8+'].map((v) => ({ v, e: v })) },
            { label: 'Meal quality', field: 'mealQuality', options: ['Poor', 'Okay', 'Good', 'Great'].map((v) => ({ v, e: v })) },
            { label: 'Hydration', field: 'hydration', options: ['Barely', 'Some', 'Decent', 'Good'].map((v) => ({ v, e: v })) },
          ].map(({ label, field, options }) => (
            <div key={field}>
              <p className={`text-xs mb-2 font-medium ${textSecondary}`}>{label}</p>
              <div className="flex gap-2">
                {options.map(({ v, e }) => (
                  <button key={v} onClick={() => setCheckinData((p) => ({ ...p, [field]: v }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${checkinData[field] === v ? pillActive : pillInactive}`}>{e}</button>
                ))}
              </div>
            </div>
          ))}
          <input type="text" value={checkinData.notes} onChange={(e) => setCheckinData((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Anything else? (optional)" className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sage-400 transition-all ${inputBg}`} />
          <div className="flex gap-2">
            <button onClick={() => setShowCheckin(false)} className={`px-4 py-2.5 text-sm rounded-xl font-medium transition-colors ${pillInactive}`}>Skip</button>
            <button onClick={submitCheckin} disabled={!checkinData.energy || checkinLoading}
              className="flex-1 py-2.5 bg-sage-600 hover:bg-sage-700 disabled:bg-warm-200 disabled:text-warm-400 text-white font-semibold rounded-xl transition-all text-sm shadow-md shadow-sage-600/20 disabled:shadow-none"
            >{checkinLoading ? 'Saving...' : 'Check in'}</button>
          </div>
        </div>
      )}

      {/* Check-in Insight */}
      {checkinInsight && (
        <div className={`border rounded-2xl p-5 animate-slide-up ${darkMode ? 'bg-sage-900/30 border-sage-700' : 'bg-sage-50 border-sage-200'}`}>
          <p className="text-xs font-semibold text-sage-600 uppercase tracking-wider mb-2">✓ Checked in {streak > 0 && `· ${streak + 1} day streak 🔥`}</p>
          <p className={`text-sm leading-relaxed ${darkMode ? 'text-sage-200' : 'text-warm-700'}`}>{checkinInsight}</p>
        </div>
      )}

      {/* Stats */}
      {profile?.weeklyCheckins?.length > 0 && !showCheckin && todayChecked && (
        <div className="flex gap-3 animate-fade-in">
          <div className={`flex-1 border rounded-xl px-4 py-3 flex items-center gap-2.5 ${card}`}>
            <TrendingUp size={14} className="text-terra-500" />
            <span className={`text-xs ${textSecondary}`}><span className={`font-semibold ${textPrimary}`}>{streak}</span> day streak</span>
          </div>
          <div className={`flex-1 border rounded-xl px-4 py-3 flex items-center gap-2.5 ${card}`}>
            <Heart size={14} className="text-sage-500" />
            <span className={`text-xs ${textSecondary}`}><span className={`font-semibold ${textPrimary}`}>{profile.weeklyCheckins.length}</span> check-ins</span>
          </div>
        </div>
      )}

      {/* Context */}
      <div className={`border rounded-2xl p-5 ${card} ${cardShadow}`}>
        <p className={`text-xs font-semibold uppercase tracking-wider mb-4 ${textMuted}`}>Your context</p>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-sage-900' : 'bg-sage-50'}`}>
            <MapPin size={14} className="text-sage-600" />
          </div>
          <input type="text" placeholder="Where are you right now?"
            value={context.location} onChange={(e) => setContext((p) => ({ ...p, location: e.target.value }))}
            className={`flex-1 bg-transparent text-sm outline-none ${darkMode ? 'text-warm-100 placeholder-warm-600' : 'text-warm-800 placeholder-warm-300'}`} />
        </div>
        {/* What's near me button */}
        {context.location && (
          <button onClick={() => onScenario(nearMePrompt)}
            className={`w-full mb-4 py-2.5 border border-dashed rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${darkMode ? 'border-sage-700 text-sage-400 hover:border-sage-500 hover:text-sage-300' : 'border-sage-300 text-sage-600 hover:border-sage-400 hover:bg-sage-50'}`}>
            <Navigation size={12} /> What's healthy near {context.location}?
          </button>
        )}
        <div className={`border-t pt-4 ${darkMode ? 'border-warm-700' : 'border-warm-100'}`}>
          <p className={`text-xs mb-2.5 flex items-center gap-1.5 font-medium ${textMuted}`}><Zap size={12} /> Energy level</p>
          <div className="flex gap-2 flex-wrap">
            {ENERGY_LEVELS.map((level) => (
              <button key={level.id} onClick={() => setContext((p) => ({ ...p, energyLevel: level.id }))}
                className={`text-xs px-3.5 py-2 rounded-full transition-all duration-200 font-medium ${context.energyLevel === level.id ? pillActive : pillInactive}`}>{level.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Google Calendar */}
      <div className={`border rounded-2xl p-5 ${card} ${cardShadow}`}>
        <div className="flex items-center justify-between mb-3">
          <p className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Schedule</p>
          {calendarConnected && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-sage-600 flex items-center gap-1 font-medium"><CheckCircle2 size={11} /> Connected</span>
              <button onClick={async () => { setRefreshing(true); await onCalendarRefresh(); setRefreshing(false) }} className={`${textMuted} hover:text-sage-600 transition-colors`}>
                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          )}
        </div>
        {calendarConnected && calendarEvents !== null ? (
          calendarEvents.length === 0
            ? <p className={`text-xs ${textMuted}`}>No upcoming events in the next 14 hours.</p>
            : <div>{calendarEvents.map((ev, i) => {
                const until = timeUntil(ev.start); const isNext = i === 0
                return (
                  <div key={i} className={`flex gap-3 py-3 ${i > 0 ? `border-t ${darkMode ? 'border-warm-700' : 'border-warm-100'}` : ''}`}>
                    <div className="text-right flex-shrink-0 w-14">
                      <p className={`text-xs tabular-nums ${textSecondary}`}>{formatEventTime(ev.start)}</p>
                      {until && <p className={`text-[10px] tabular-nums ${isNext ? 'text-sage-600 font-medium' : textMuted}`}>{until}</p>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isNext ? `font-medium ${textPrimary}` : textSecondary}`}>{ev.title}</p>
                      {ev.location && <p className={`text-[11px] truncate mt-0.5 ${textMuted}`}>{ev.location}</p>}
                    </div>
                  </div>
                )
              })}</div>
        ) : (
          <button onClick={() => { window.location.href = `${apiBase}/api/calendar/connect` }}
            className={`w-full py-4 border border-dashed rounded-xl text-sm flex items-center justify-center gap-2 transition-all ${darkMode ? 'border-warm-600 text-warm-500 hover:text-warm-300 hover:border-warm-500' : 'border-warm-300 text-warm-400 hover:text-warm-600 hover:border-warm-400'}`}>
            <Calendar size={15} /> Connect Google Calendar
          </button>
        )}
      </div>

      {/* Scenarios */}
      <div>
        <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${textMuted}`}>What's your situation?</p>
        <div className="grid grid-cols-2 gap-2.5">
          {SCENARIOS.map((s) => {
            const Icon = s.icon
            return (
              <button key={s.id} onClick={() => onScenario(s.message)}
                className={`border rounded-2xl p-4 text-left transition-all duration-200 hover:shadow-md active:scale-[0.97] ${card} ${darkMode ? 'hover:border-warm-600' : 'hover:border-warm-300'}`}>
                <div className={`w-9 h-9 rounded-xl ${darkMode ? 'bg-warm-700' : s.bg} flex items-center justify-center mb-3`}>
                  <Icon size={16} className={s.color} />
                </div>
                <span className={`text-sm font-medium leading-tight block ${darkMode ? 'text-warm-300' : 'text-warm-700'}`}>{s.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tip */}
      <div className={`border rounded-2xl p-5 ${darkMode ? 'bg-sage-900/30 border-sage-700' : 'bg-sage-50 border-sage-200'}`}>
        <p className="text-xs font-semibold text-sage-600 uppercase tracking-wider mb-2">Right now — for you</p>
        <p className={`text-sm leading-relaxed ${darkMode ? 'text-sage-200' : 'text-warm-700'}`}><span className="mr-1.5">{icon}</span>{tip}</p>
      </div>

      <div className="h-3" />
    </div>
  )
}