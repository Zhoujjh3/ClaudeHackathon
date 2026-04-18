import { useState, useEffect } from 'react'
import { MapPin, Zap, Plane, Moon, Coffee, Clock, Wind, Flame, Calendar, CheckCircle2, RefreshCw } from 'lucide-react'

const SCENARIOS = [
  {
    id: 'airport',
    icon: Plane,
    label: 'At the airport',
    color: 'text-blue-400',
    border: 'hover:border-blue-500/25',
    message: "I'm at the airport and need to eat. What should I look for and what should I avoid? I have about 20 minutes before boarding.",
  },
  {
    id: 'late-night',
    icon: Moon,
    label: 'Late night shift',
    color: 'text-purple-400',
    border: 'hover:border-purple-500/25',
    message: "It's late and I'm still working. I need to eat something but also need to eventually sleep. What should I have right now?",
  },
  {
    id: 'post-red-eye',
    icon: Coffee,
    label: 'Post red-eye',
    color: 'text-amber-400',
    border: 'hover:border-amber-500/25',
    message: "I just landed from an overnight flight. I'm exhausted and my body is wrecked. What should I eat and drink to bounce back fast?",
  },
  {
    id: 'deadline',
    icon: Flame,
    label: 'On deadline',
    color: 'text-red-400',
    border: 'hover:border-red-500/25',
    message: "I'm on deadline and need to stay sharp for the next 4-5 hours. What should I eat or drink right now?",
  },
  {
    id: 'between',
    icon: Wind,
    label: 'Between stories',
    color: 'text-green-400',
    border: 'hover:border-green-500/25',
    message: "I have real downtime between assignments. I want to take care of my body properly. What should I focus on right now?",
  },
  {
    id: 'quick-break',
    icon: Clock,
    label: 'Quick break (10 min)',
    color: 'text-cyan-400',
    border: 'hover:border-cyan-500/25',
    message: "I only have 10 minutes. What's the single best thing I can eat or drink to keep my energy up?",
  },
]

const ENERGY_LEVELS = [
  { id: 'exhausted', label: 'Exhausted' },
  { id: 'tired', label: 'Tired' },
  { id: 'normal', label: 'Normal' },
  { id: 'good', label: 'Good' },
  { id: 'energized', label: 'Sharp' },
]

function getTimeBasedTip(hour) {
  if (hour < 7) return { tip: "Hydrate before caffeine — cortisol is already peaking after sleep. Water first, coffee in 90 minutes.", icon: '💧' }
  if (hour < 10) return { tip: 'Start with protein, not carbs. Eggs, Greek yogurt, or nuts stabilize blood sugar for hours of sharp thinking.', icon: '🥚' }
  if (hour < 13) return { tip: "Pre-lunch dip hits around 11:30am. A handful of mixed nuts now prevents bad lunch decisions.", icon: '🥜' }
  if (hour < 15) return { tip: "Cognitive performance lunch: salmon > sandwich. Omega-3s and B12 are your brain's best fuel.", icon: '🐟' }
  if (hour < 17) return { tip: "Afternoon slump? Try 16oz of water before coffee. Dehydration mimics fatigue almost perfectly.", icon: '⚡' }
  if (hour < 20) return { tip: "Evening meal: eat at least 2 hours before wind-down to avoid poor sleep quality.", icon: '🌙' }
  if (hour < 23) return { tip: "Late eating: go protein + fat, skip the carb spike. Carbs this late disrupt your sleep architecture.", icon: '🛡️' }
  return { tip: "After midnight: your gut is shutting down. Handful of nuts max — not a full meal.", icon: '🌑' }
}

function formatEventTime(isoString) {
  if (!isoString || !isoString.includes('T')) return 'All day'
  try {
    return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

function timeUntil(isoString) {
  if (!isoString || !isoString.includes('T')) return ''
  try {
    const diff = Math.round((new Date(isoString) - new Date()) / 60000)
    if (diff < 0) return 'now'
    if (diff < 60) return `${diff}m`
    return `${Math.floor(diff / 60)}h ${diff % 60}m`
  } catch {
    return ''
  }
}

export default function Dashboard({ context, setContext, onScenario, calendarConnected, calendarEvents, onCalendarRefresh, apiBase }) {
  const [now, setNow] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const { tip, icon } = getTimeBasedTip(hour)

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
          <p className="text-[10px] text-gray-600 mb-2 flex items-center gap-1">
            <Zap size={11} /> Energy level
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {ENERGY_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => setContext((p) => ({ ...p, energyLevel: level.id }))}
                className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
                  context.energyLevel === level.id
                    ? 'bg-green-500 text-black shadow-lg shadow-green-900/30'
                    : 'bg-[#181818] text-gray-500 border border-[#242424] hover:border-[#333]'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar card */}
      <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
            Today's Schedule
          </p>
          {calendarConnected ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-green-400 flex items-center gap-1">
                <CheckCircle2 size={10} /> Connected
              </span>
              <button onClick={handleRefresh} className="text-gray-600 hover:text-gray-400 transition-colors">
                <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          ) : null}
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
                  <div
                    key={i}
                    className={`flex gap-3 py-2.5 ${i > 0 ? 'border-t border-[#1a1a1a]' : ''}`}
                  >
                    <div className="text-right flex-shrink-0 w-14">
                      <p className="text-xs text-gray-400 tabular-nums">{formatEventTime(ev.start)}</p>
                      {until && (
                        <p className={`text-[10px] tabular-nums ${isNext ? 'text-green-500' : 'text-gray-600'}`}>
                          {until}
                        </p>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isNext ? 'text-white' : 'text-gray-300'}`}>
                        {ev.title}
                      </p>
                      {ev.location && (
                        <p className="text-[11px] text-gray-600 truncate mt-0.5">{ev.location}</p>
                      )}
                    </div>
                    {isNext && (
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                    )}
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
            <span className="text-[11px] text-gray-700 ml-0.5">— get schedule-aware advice</span>
          </button>
        )}
      </div>

      {/* Quick scenarios */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2.5">
          What's your situation?
        </p>
        <div className="grid grid-cols-2 gap-2">
          {SCENARIOS.map((s) => {
            const Icon = s.icon
            return (
              <button
                key={s.id}
                onClick={() => onScenario(s.message)}
                className={`bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-4 text-left transition-all ${s.border} hover:bg-[#121212] active:scale-95`}
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
        <p className="text-[10px] font-semibold text-green-500 uppercase tracking-widest mb-1.5">Right now</p>
        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="mr-1.5">{icon}</span>
          {tip}
        </p>
      </div>

      <div className="h-2" />
    </div>
  )
}
