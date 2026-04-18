import { useState, useEffect } from 'react'
import {
  MapPin, Zap, Plane, Moon, Coffee, Clock, Wind, Flame,
  ChevronRight, Brain, TrendingUp, Calendar, CheckCircle2, RefreshCw,
} from 'lucide-react'
import axios from 'axios'

const SCENARIOS = [
  {
    id: 'airport',
    icon: Plane,
    label: 'At the airport',
    color: 'text-blue-400',
    bg: 'bg-blue-500/5',
    border: 'hover:border-blue-500/25',
    message: "I'm at the airport and need to eat. What should I look for and what should I avoid? I have about 20 minutes before boarding.",
  },
  {
    id: 'late-night',
    icon: Moon,
    label: 'Late night shift',
    color: 'text-purple-400',
    bg: 'bg-purple-500/5',
    border: 'hover:border-purple-500/25',
    message: "It's late and I'm still working. I need to eat something but also need to eventually sleep. What should I have right now?",
  },
  {
    id: 'post-red-eye',
    icon: Coffee,
    label: 'Post red-eye',
    color: 'text-amber-400',
    bg: 'bg-amber-500/5',
    border: 'hover:border-amber-500/25',
    message: "I just landed from an overnight flight. I'm exhausted and my body is wrecked. What should I eat and drink to bounce back fast?",
  },
  {
    id: 'deadline',
    icon: Flame,
    label: 'On deadline',
    color: 'text-red-400',
    bg: 'bg-red-500/5',
    border: 'hover:border-red-500/25',
    message: "I'm on deadline and need to stay sharp for the next 4-5 hours. What should I eat or drink right now?",
  },
  {
    id: 'between',
    icon: Wind,
    label: 'Between stories',
    color: 'text-green-400',
    bg: 'bg-green-500/5',
    border: 'hover:border-green-500/25',
    message: "I have real downtime between assignments. I want to take care of my body properly. What should I focus on right now?",
  },
  {
    id: 'quick-break',
    icon: Clock,
    label: 'Quick break (10 min)',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/5',
    border: 'hover:border-cyan-500/25',
    message: "I only have 10 minutes. What's the single best thing I can eat or drink to keep my energy up?",
  },
]

const ENERGY_LEVELS = [
  { id: 'exhausted', label: 'Exhausted', emoji: '😩' },
  { id: 'tired', label: 'Tired', emoji: '😴' },
  { id: 'normal', label: 'Normal', emoji: '😐' },
  { id: 'good', label: 'Good', emoji: '🙂' },
  { id: 'energized', label: 'Sharp', emoji: '⚡' },
]

function getTimeBasedTip(hour, profile) {
  const goals = profile?.healthGoals || []
  const caffeine = profile?.caffeineHabit || ''

  if (hour < 7) {
    if (caffeine === 'heavy')
      return { tip: "Hydrate before caffeine — your cortisol is peaking naturally. Water first, delay that first cup by 90 min. You'll actually feel more alert.", icon: '💧' }
    return { tip: "Hydrate before caffeine — cortisol is already peaking after sleep. Water first, coffee in 90 minutes.", icon: '💧' }
  }
  if (hour < 10) {
    if (goals.includes('Mental clarity'))
      return { tip: 'Brain fuel morning: eggs + avocado or Greek yogurt with walnuts. Omega-3s and choline fire up your prefrontal cortex.', icon: '🧠' }
    return { tip: 'Start with protein, not carbs. Eggs, Greek yogurt, or nuts stabilize blood sugar for hours of sharp thinking.', icon: '🥚' }
  }
  if (hour < 13) return { tip: "Pre-lunch dip hits around 11:30am. A handful of mixed nuts now prevents bad lunch decisions.", icon: '🥜' }
  if (hour < 15) {
    if (goals.includes('Gut health'))
      return { tip: 'Lunch pick: salmon or grilled chicken with fermented sides (kimchi, sauerkraut). Your gut microbiome will thank you on the road.', icon: '🐟' }
    return { tip: "Cognitive performance lunch: salmon > sandwich. Omega-3s and B12 are your brain's best fuel.", icon: '🐟' }
  }
  if (hour < 17) {
    if (caffeine === 'heavy' || goals.includes('Reduce caffeine'))
      return { tip: "Afternoon slump? 16oz water + a short walk instead of another coffee. Caffeine after 2pm wrecks tonight's sleep.", icon: '⚡' }
    return { tip: "Afternoon slump? Try 16oz of water before coffee. Dehydration mimics fatigue almost perfectly.", icon: '⚡' }
  }
  if (hour < 20) {
    if (goals.includes('Better sleep'))
      return { tip: 'Eat now if you can — 3+ hours before bed is ideal. Magnesium-rich foods (dark leafy greens, almonds) set up better sleep tonight.', icon: '🌙' }
    return { tip: "Evening meal: eat at least 2 hours before wind-down to avoid poor sleep quality.", icon: '🌙' }
  }
  if (hour < 23) return { tip: "Late eating: go protein + fat, skip the carb spike. Carbs this late disrupt your sleep architecture.", icon: '🛡️' }
  return { tip: "After midnight: your gut is shutting down. Handful of nuts max — not a full meal.", icon: '🌑' }
}

function getStreakCount(checkins) {
  if (!checkins || checkins.length === 0) return 0
  let streak = 0
  const sorted = [...checkins].sort((a, b) => b.date.localeCompare(a.date))
  const expectedDate = new Date()
  for (const c of sorted) {
    const expected = expectedDate.toISOString().split('T')[0]
    if (c.date === expected) {
      streak++
      expectedDate.setDate(expectedDate.getDate() - 1)
    } else if (c.date < expected) {
      break
    }
  }
  return streak
}

function formatEventTime(isoString) {
  if (!isoString || !isoString.includes('T')) return 'All day'
  try { return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }
  catch { return '' }
}

function timeUntil(isoString) {
  if (!isoString || !isoString.includes('T')) return ''
  try {
    const diff = Math.round((new Date(isoString) - new Date()) / 60000)
    if (diff < 0) return 'now'
    if (diff < 60) return `${diff}m`
    return `${Math.floor(diff / 60)}h ${diff % 60}m`
  } catch { return '' }
}

export default function Dashboard({ context, setContext, onScenario, profile, onCheckin, calendarConnected, calendarEvents, onCalendarRefresh, apiBase }) {
  const [now, setNow] = useState(new Date())
  const [showCheckin, setShowCheckin] = useState(false)
  const [checkinData, setCheckinData] = useState({ energy: '', sleepHours: '', mealQuality: '', hydration: '', notes: '' })
  const [checkinInsight, setCheckinInsight] = useState(null)
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const hour = now.getHours()
  const name = profile?.name || ''
  const greeting = hour < 12 ? `Good morning${name ? ', ' + name : ''}` : hour < 17 ? `Good afternoon${name ? ', ' + name : ''}` : `Good evening${name ? ', ' + name : ''}`
  const { tip, icon } = getTimeBasedTip(hour, profile)
  const streak = getStreakCount(profile?.weeklyCheckins)
  const todayChecked = profile?.weeklyCheckins?.some((c) => c.date === new Date().toISOString().split('T')[0])

  const submitCheckin = async () => {
    setCheckinLoading(true)
    onCheckin(checkinData)
    try {
      const resp = await axios.post(`${apiBase}/api/checkin-insight`, { profile, checkin: checkinData })
      setCheckinInsight(resp.data.insight)
    } catch {
      setCheckinInsight("Logged! Couldn't generate an insight right now, but your data is saved.")
    } finally {
      setCheckinLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await onCalendarRefresh()
    setRefreshing(false)
  }

  const connectCalendar = () => {
    window.location.href = `${apiBase}/api/calendar/connect`
  }

  return (
    <div className="overflow-y-auto h-[calc(100vh-112px)] px-4 py-5 space-y-4">
      {/* Greeting */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">{greeting}.</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Daily Check-in CTA */}
      {!todayChecked && !showCheckin && (
        <button
          onClick={() => setShowCheckin(true)}
          className="w-full bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-transparent border border-green-500/20 rounded-2xl p-4 text-left transition-all hover:border-green-500/40 hover:from-green-500/15 animate-slide-up group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-400 group-hover:text-green-300 transition-colors">Daily check-in</p>
              <p className="text-xs text-gray-500 mt-0.5">30 seconds — helps me personalize your advice</p>
            </div>
            <ChevronRight size={16} className="text-green-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
          {streak > 0 && (
            <p className="text-[10px] text-green-600 mt-2">🔥 {streak} day streak</p>
          )}
        </button>
      )}

      {/* Check-in Form */}
      {showCheckin && !checkinInsight && (
        <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-4 space-y-4 animate-slide-down">
          <p className="text-[10px] font-semibold text-green-400 uppercase tracking-widest">Quick check-in</p>

          <div>
            <p className="text-xs text-gray-500 mb-2">How's your energy?</p>
            <div className="flex gap-2">
              {[
                { v: '1', e: '😩' }, { v: '2', e: '😴' }, { v: '3', e: '😐' }, { v: '4', e: '🙂' }, { v: '5', e: '⚡' },
              ].map(({ v, e }) => (
                <button
                  key={v}
                  onClick={() => setCheckinData((p) => ({ ...p, energy: v }))}
                  className={`flex-1 py-2.5 rounded-xl text-base transition-all duration-200 ${
                    checkinData.energy === v
                      ? 'bg-green-500 shadow-lg shadow-green-900/30 scale-110'
                      : 'bg-[#181818] border border-[#242424] hover:border-[#333]'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2">Hours of sleep last night</p>
            <div className="flex gap-2">
              {['<4', '4-5', '6-7', '7-8', '8+'].map((v) => (
                <button
                  key={v}
                  onClick={() => setCheckinData((p) => ({ ...p, sleepHours: v }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                    checkinData.sleepHours === v
                      ? 'bg-green-500 text-black shadow-lg shadow-green-900/30'
                      : 'bg-[#181818] text-gray-600 border border-[#242424] hover:border-[#333]'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2">Meal quality today</p>
            <div className="flex gap-2">
              {['Poor', 'Okay', 'Good', 'Great'].map((v) => (
                <button
                  key={v}
                  onClick={() => setCheckinData((p) => ({ ...p, mealQuality: v }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                    checkinData.mealQuality === v
                      ? 'bg-green-500 text-black shadow-lg shadow-green-900/30'
                      : 'bg-[#181818] text-gray-600 border border-[#242424] hover:border-[#333]'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2">Hydration</p>
            <div className="flex gap-2">
              {['Barely', 'Some', 'Decent', 'Good'].map((v) => (
                <button
                  key={v}
                  onClick={() => setCheckinData((p) => ({ ...p, hydration: v }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                    checkinData.hydration === v
                      ? 'bg-green-500 text-black shadow-lg shadow-green-900/30'
                      : 'bg-[#181818] text-gray-600 border border-[#242424] hover:border-[#333]'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <input
            type="text"
            value={checkinData.notes}
            onChange={(e) => setCheckinData((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Anything else? (optional)"
            className="w-full bg-[#181818] border border-[#242424] rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder-gray-700 focus:border-green-500/40 transition-colors"
          />

          <div className="flex gap-2">
            <button onClick={() => setShowCheckin(false)} className="px-4 py-2.5 bg-[#181818] border border-[#242424] text-gray-500 text-sm rounded-xl hover:border-[#333] transition-colors">
              Skip
            </button>
            <button
              onClick={submitCheckin}
              disabled={!checkinData.energy || checkinLoading}
              className="flex-1 py-2.5 bg-green-500 hover:bg-green-400 disabled:bg-[#1a1a1a] disabled:text-gray-700 text-black font-semibold rounded-xl transition-all text-sm shadow-lg shadow-green-900/30 disabled:shadow-none"
            >
              {checkinLoading ? 'Saving...' : 'Check in'}
            </button>
          </div>
        </div>
      )}

      {/* Check-in Insight */}
      {checkinInsight && (
        <div className="bg-[#0a150a] border border-green-900/40 rounded-2xl p-4 animate-slide-up">
          <p className="text-[10px] font-semibold text-green-500 uppercase tracking-widest mb-2">
            ✓ Checked in {streak > 0 && `· ${streak + 1} day streak 🔥`}
          </p>
          <p className="text-sm text-gray-300 leading-relaxed">{checkinInsight}</p>
        </div>
      )}

      {/* Streak + Stats */}
      {profile?.weeklyCheckins?.length > 0 && !showCheckin && todayChecked && (
        <div className="flex gap-2 animate-fade-in">
          <div className="flex-1 bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl px-3 py-2.5 flex items-center gap-2">
            <TrendingUp size={13} className="text-green-400" />
            <span className="text-xs text-gray-400"><span className="text-white font-semibold">{streak}</span> day streak</span>
          </div>
          <div className="flex-1 bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl px-3 py-2.5 flex items-center gap-2">
            <Brain size={13} className="text-purple-400" />
            <span className="text-xs text-gray-400"><span className="text-white font-semibold">{profile.weeklyCheckins.length}</span> check-ins</span>
          </div>
        </div>
      )}

      {/* Context card */}
      <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-4 animate-slide-up">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Your Context</p>
        <div className="flex items-center gap-2.5 mb-3">
          <MapPin size={14} className="text-green-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Where are you right now? (airport, hotel, city...)"
            value={context.location}
            onChange={(e) => setContext((p) => ({ ...p, location: e.target.value }))}
            className="flex-1 bg-transparent text-sm outline-none placeholder-gray-700 text-white"
          />
        </div>
        <div className="border-t border-[#1a1a1a] pt-3">
          <p className="text-[10px] text-gray-600 mb-2 flex items-center gap-1"><Zap size={11} /> Energy level</p>
          <div className="flex gap-1.5 flex-wrap">
            {ENERGY_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => setContext((p) => ({ ...p, energyLevel: level.id }))}
                className={`text-xs px-3 py-1.5 rounded-xl transition-all duration-200 font-medium flex items-center gap-1 ${
                  context.energyLevel === level.id
                    ? 'bg-green-500 text-black shadow-lg shadow-green-900/30'
                    : 'bg-[#181818] text-gray-500 border border-[#242424] hover:border-[#333]'
                }`}
              >
                <span>{level.emoji}</span> {level.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar card */}
      <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Today's Schedule</p>
          {calendarConnected && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-green-400 flex items-center gap-1"><CheckCircle2 size={10} /> Connected</span>
              <button onClick={handleRefresh} className="text-gray-600 hover:text-gray-400 transition-colors">
                <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          )}
        </div>
        {calendarConnected && calendarEvents !== null ? (
          calendarEvents.length === 0 ? (
            <p className="text-xs text-gray-600 py-1">No upcoming events in the next 14 hours.</p>
          ) : (
            <div className="space-y-0">
              {calendarEvents.map((ev, i) => {
                const until = timeUntil(ev.start)
                const isNext = i === 0
                return (
                  <div key={i} className={`flex gap-3 py-2.5 ${i > 0 ? 'border-t border-[#1a1a1a]' : ''}`}>
                    <div className="text-right flex-shrink-0 w-14">
                      <p className="text-xs text-gray-400 tabular-nums">{formatEventTime(ev.start)}</p>
                      {until && <p className={`text-[10px] tabular-nums ${isNext ? 'text-green-500' : 'text-gray-600'}`}>{until}</p>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isNext ? 'text-white' : 'text-gray-300'}`}>{ev.title}</p>
                      {ev.location && <p className="text-[11px] text-gray-600 truncate mt-0.5">{ev.location}</p>}
                    </div>
                    {isNext && <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0 animate-pulse-soft" />}
                  </div>
                )
              })}
            </div>
          )
        ) : (
          <button
            onClick={connectCalendar}
            className="w-full py-4 border border-dashed border-[#242424] rounded-xl text-sm text-gray-600 hover:text-gray-300 hover:border-[#333] transition-all flex items-center justify-center gap-2 group"
          >
            <Calendar size={15} className="group-hover:text-green-400 transition-colors" />
            Connect Google Calendar
            <span className="text-[11px] text-gray-700 ml-0.5">— schedule-aware advice</span>
          </button>
        )}
      </div>

      {/* Quick scenarios */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2.5">What's your situation?</p>
        <div className="grid grid-cols-2 gap-2">
          {SCENARIOS.map((s, i) => {
            const Icon = s.icon
            return (
              <button
                key={s.id}
                onClick={() => onScenario(s.message)}
                className={`${s.bg} bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-4 text-left transition-all duration-200 ${s.border} hover:bg-[#121212] active:scale-[0.97]`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <Icon size={17} className={`${s.color} mb-2.5`} />
                <span className="text-sm font-medium text-gray-200 leading-tight block">{s.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Time-aware tip */}
      <div className="bg-[#0a150a] border border-green-900/40 rounded-2xl p-4">
        <p className="text-[10px] font-semibold text-green-500 uppercase tracking-widest mb-1.5">Right now — for you</p>
        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="mr-1.5">{icon}</span>{tip}
        </p>
      </div>

      <div className="h-2" />
    </div>
  )
}
