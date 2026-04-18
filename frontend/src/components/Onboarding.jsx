import { useState } from 'react'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'
import Logo from './Logo'

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free',
  'Halal', 'Kosher', 'Pescatarian', 'Keto', 'No restrictions',
]

const GOAL_OPTIONS = [
  { label: 'Sustained energy', emoji: '⚡' },
  { label: 'Better sleep', emoji: '🌙' },
  { label: 'Weight management', emoji: '⚖️' },
  { label: 'Mental clarity', emoji: '🧠' },
  { label: 'Gut health', emoji: '🫁' },
  { label: 'Reduce caffeine', emoji: '☕' },
  { label: 'Eat more whole foods', emoji: '🥗' },
  { label: 'Stay hydrated', emoji: '💧' },
  { label: 'Manage stress eating', emoji: '🧘' },
]

const TRAVEL_FREQ = [
  { id: 'weekly', label: '3–5 days/week', desc: 'Constantly on the road' },
  { id: 'biweekly', label: '1–2 trips/week', desc: 'Heavy but some home days' },
  { id: 'monthly', label: 'A few trips/month', desc: 'Mix of field and desk' },
  { id: 'occasional', label: 'Occasional travel', desc: 'Mostly based in one place' },
]

const SLEEP_PATTERNS = [
  { id: 'irregular', label: 'Totally irregular' },
  { id: 'late', label: 'Night owl' },
  { id: 'early', label: 'Early riser' },
  { id: 'split', label: 'Split sleeper' },
  { id: 'normal', label: 'Fairly regular' },
]

const CAFFEINE_HABITS = [
  { id: 'heavy', label: '4+ cups' },
  { id: 'moderate', label: '2–3 cups' },
  { id: 'light', label: '1 cup' },
  { id: 'none', label: 'None' },
  { id: 'energy-drinks', label: 'Energy drinks' },
]

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState({
    name: '', dietaryRestrictions: [], healthGoals: [],
    travelFrequency: '', sleepPattern: '', caffeineHabit: '',
    sensitivities: '', homeBase: '',
  })

  const toggleArray = (field, value) => {
    setData((prev) => {
      const arr = prev[field]
      if (value === 'No restrictions' && field === 'dietaryRestrictions')
        return { ...prev, [field]: arr.includes(value) ? [] : [value] }
      const filtered = arr.filter((v) => v !== 'No restrictions')
      return { ...prev, [field]: filtered.includes(value) ? filtered.filter((v) => v !== value) : [...filtered, value] }
    })
  }

  const steps = [
    // Welcome
    <div key="welcome" className="space-y-8 animate-fade-in">
      <div className="text-center pt-8">
        <Logo size={64} className="mx-auto mb-6 rounded-2xl shadow-lg shadow-sage-600/20" />
        <h1 className="font-display text-3xl font-bold text-warm-900">Welcome to FieldFit</h1>
        <p className="text-warm-500 mt-3 text-sm leading-relaxed max-w-sm mx-auto">
          Your personal health coach, built for the unpredictable life of field journalism. Let's set things up — about 60 seconds.
        </p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-warm-500 font-semibold block mb-2">What should I call you?</label>
          <input
            type="text" value={data.name}
            onChange={(e) => setData((p) => ({ ...p, name: e.target.value }))}
            placeholder="First name"
            className="w-full bg-white border border-warm-200 rounded-xl px-5 py-4 text-warm-900 text-lg outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100 placeholder-warm-300 transition-all"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs text-warm-500 font-semibold block mb-2">Home base timezone</label>
          <input
            type="text" value={data.homeBase}
            onChange={(e) => setData((p) => ({ ...p, homeBase: e.target.value }))}
            placeholder="e.g. Eastern, Pacific, Central Europe..."
            className="w-full bg-white border border-warm-200 rounded-xl px-5 py-3.5 text-warm-900 outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100 placeholder-warm-300 text-sm transition-all"
          />
        </div>
      </div>
    </div>,

    // Dietary
    <div key="dietary" className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-warm-900">Dietary needs</h2>
        <p className="text-warm-500 text-sm mt-1">Select all that apply.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {DIETARY_OPTIONS.map((opt) => (
          <button key={opt} onClick={() => toggleArray('dietaryRestrictions', opt)}
            className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
              data.dietaryRestrictions.includes(opt)
                ? 'bg-sage-600 text-white shadow-md shadow-sage-600/20'
                : 'bg-white border border-warm-200 text-warm-600 hover:border-warm-300'
            }`}
          >{opt}</button>
        ))}
      </div>
      <div>
        <label className="text-xs text-warm-500 font-semibold block mb-2">Allergies or sensitivities</label>
        <input type="text" value={data.sensitivities}
          onChange={(e) => setData((p) => ({ ...p, sensitivities: e.target.value }))}
          placeholder="e.g. lactose intolerant, shellfish allergy..."
          className="w-full bg-white border border-warm-200 rounded-xl px-4 py-3.5 text-warm-900 outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100 placeholder-warm-300 text-sm transition-all"
        />
      </div>
    </div>,

    // Goals
    <div key="goals" className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-warm-900">Health goals</h2>
        <p className="text-warm-500 text-sm mt-1">Pick your top priorities.</p>
      </div>
      <div className="space-y-2">
        {GOAL_OPTIONS.map((opt) => (
          <button key={opt.label} onClick={() => toggleArray('healthGoals', opt.label)}
            className={`w-full text-left px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-3 ${
              data.healthGoals.includes(opt.label)
                ? 'bg-sage-50 border-2 border-sage-400 text-sage-800'
                : 'bg-white border border-warm-200 text-warm-600 hover:border-warm-300'
            }`}
          >
            <span className="text-lg">{opt.emoji}</span>
            <span className="flex-1">{opt.label}</span>
            {data.healthGoals.includes(opt.label) && <Check size={16} className="text-sage-600" />}
          </button>
        ))}
      </div>
    </div>,

    // Lifestyle
    <div key="lifestyle" className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-warm-900">Your rhythm</h2>
        <p className="text-warm-500 text-sm mt-1">Helps calibrate advice to your actual life.</p>
      </div>
      <div>
        <p className="text-xs text-warm-500 font-semibold mb-2.5">Travel frequency</p>
        <div className="space-y-2">
          {TRAVEL_FREQ.map((opt) => (
            <button key={opt.id} onClick={() => setData((p) => ({ ...p, travelFrequency: opt.id }))}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
                data.travelFrequency === opt.id
                  ? 'bg-sage-50 border-2 border-sage-400 text-sage-800'
                  : 'bg-white border border-warm-200 text-warm-600 hover:border-warm-300'
              }`}
            >
              <span className="text-sm font-medium block">{opt.label}</span>
              <span className="text-xs text-warm-400 block mt-0.5">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-warm-500 font-semibold mb-2.5">Sleep pattern</p>
        <div className="flex flex-wrap gap-2">
          {SLEEP_PATTERNS.map((opt) => (
            <button key={opt.id} onClick={() => setData((p) => ({ ...p, sleepPattern: opt.id }))}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                data.sleepPattern === opt.id
                  ? 'bg-sage-600 text-white shadow-md shadow-sage-600/20'
                  : 'bg-white border border-warm-200 text-warm-600 hover:border-warm-300'
              }`}
            >{opt.label}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-warm-500 font-semibold mb-2.5">Caffeine intake</p>
        <div className="flex flex-wrap gap-2">
          {CAFFEINE_HABITS.map((opt) => (
            <button key={opt.id} onClick={() => setData((p) => ({ ...p, caffeineHabit: opt.id }))}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                data.caffeineHabit === opt.id
                  ? 'bg-sage-600 text-white shadow-md shadow-sage-600/20'
                  : 'bg-white border border-warm-200 text-warm-600 hover:border-warm-300'
              }`}
            >{opt.label}</button>
          ))}
        </div>
      </div>
    </div>,
  ]

  const canProceed = step === 0 ? data.name.trim().length > 0 : step === 2 ? data.healthGoals.length > 0 : true
  const isLast = step === steps.length - 1

  return (
    <div className="min-h-screen bg-cream flex flex-col max-w-2xl mx-auto">
      {/* Progress */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-sage-500' : 'bg-warm-200'}`} />
          ))}
        </div>
        <p className="text-[11px] text-warm-400 mt-2.5 font-medium">Step {step + 1} of {steps.length}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">{steps[step]}</div>

      <div className="px-6 py-5 flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)}
            className="px-5 py-3.5 bg-white border border-warm-200 text-warm-600 rounded-xl text-sm font-medium hover:bg-warm-50 transition-all flex items-center gap-1"
          ><ChevronLeft size={14} /> Back</button>
        )}
        <button
          onClick={() => (isLast ? onComplete(data) : setStep((s) => s + 1))}
          disabled={!canProceed}
          className="flex-1 py-3.5 bg-sage-600 hover:bg-sage-700 disabled:bg-warm-200 disabled:text-warm-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-sage-600/20 disabled:shadow-none"
        >
          {isLast ? (<><Check size={16} strokeWidth={2.5} /> Let's go</>) : (<>Continue <ChevronRight size={14} /></>)}
        </button>
      </div>
    </div>
  )
}
