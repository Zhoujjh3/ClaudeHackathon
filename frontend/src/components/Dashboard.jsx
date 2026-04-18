import { useState, useEffect } from 'react'
import { MapPin, Zap, Plane, Moon, Coffee, Clock, Wind, Flame } from 'lucide-react'

const SCENARIOS = [
  {
    id: 'airport',
    icon: Plane,
    label: 'At the airport',
    color: 'text-blue-400',
    glow: 'hover:border-blue-500/30',
    message:
      "I'm at the airport and need to eat. What should I look for and what should I avoid? I have about 20 minutes before boarding.",
  },
  {
    id: 'late-night',
    icon: Moon,
    label: 'Late night shift',
    color: 'text-purple-400',
    glow: 'hover:border-purple-500/30',
    message:
      "It's late and I'm still working. I need to eat something but I also need to eventually sleep. What should I have right now?",
  },
  {
    id: 'post-red-eye',
    icon: Coffee,
    label: 'Post red-eye',
    color: 'text-amber-400',
    glow: 'hover:border-amber-500/30',
    message:
      "I just landed from an overnight flight. I'm exhausted and my body is wrecked. What should I eat and drink to bounce back as fast as possible?",
  },
  {
    id: 'deadline',
    icon: Flame,
    label: 'On deadline',
    color: 'text-red-400',
    glow: 'hover:border-red-500/30',
    message:
      "I'm on deadline and need to stay sharp and focused for the next 4-5 hours. What should I eat or drink right now to keep my brain at peak performance?",
  },
  {
    id: 'between',
    icon: Wind,
    label: 'Between stories',
    color: 'text-green-400',
    glow: 'hover:border-green-500/30',
    message:
      "I have some real downtime between assignments. I want to take care of my body properly. What should I be doing right now for my health?",
  },
  {
    id: 'quick-break',
    icon: Clock,
    label: 'Quick break (10 min)',
    color: 'text-cyan-400',
    glow: 'hover:border-cyan-500/30',
    message:
      "I only have 10 minutes. What's the single best thing I can eat or drink right now to keep my energy up? Make it realistic — I'm on the go.",
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
  if (hour < 7)
    return {
      tip: "Hydrate before caffeine — after sleep your cortisol is already peaking naturally. Water first, coffee in 90 minutes.",
      icon: '💧',
    }
  if (hour < 10)
    return {
      tip: 'Start with protein, not carbs. Eggs, Greek yogurt, or nuts stabilize blood sugar for hours of sharp thinking.',
      icon: '🥚',
    }
  if (hour < 13)
    return {
      tip: "Pre-lunch dip incoming around 11:30am. A handful of mixed nuts now prevents you from making bad lunch decisions.",
      icon: '🥜',
    }
  if (hour < 15)
    return {
      tip: "Pick your lunch for cognitive performance: salmon > sandwich. Omega-3s and B12 are your brain's best friends.",
      icon: '🐟',
    }
  if (hour < 17)
    return {
      tip: "Afternoon slump? Try 16oz of water before reaching for coffee. Dehydration mimics fatigue almost perfectly.",
      icon: '⚡',
    }
  if (hour < 20)
    return {
      tip: "Evening meal timing matters: eat at least 2 hours before any wind-down time to avoid poor sleep quality.",
      icon: '🌙',
    }
  if (hour < 23)
    return {
      tip: "Late eating: go protein + fat, avoid carb spikes. Carbs this late will disrupt your sleep architecture.",
      icon: '🛡️',
    }
  return {
    tip: "After midnight: your gut is shutting down. If you must eat, keep it tiny — handful of nuts, not a full meal.",
    icon: '🌑',
  }
}

export default function Dashboard({ context, setContext, onScenario }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const { tip, icon } = getTimeBasedTip(hour)

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
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">
          Your Context
        </p>

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
            <Zap size={11} className="text-gray-600" /> Energy level
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
                className={`bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-4 text-left transition-all ${s.glow} hover:bg-[#121212] active:scale-95`}
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
        <p className="text-[10px] font-semibold text-green-500 uppercase tracking-widest mb-1.5">
          Right now
        </p>
        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="mr-1.5">{icon}</span>
          {tip}
        </p>
      </div>

      {/* Bottom padding for nav */}
      <div className="h-2" />
    </div>
  )
}
