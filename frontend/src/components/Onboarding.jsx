import { useState } from 'react'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free',
  'Halal', 'Kosher', 'Pescatarian', 'Keto', 'No restrictions',
]

const GOAL_OPTIONS = [
  'Sustained energy', 'Better sleep', 'Weight management',
  'Mental clarity', 'Gut health', 'Reduce caffeine',
  'Eat more whole foods', 'Stay hydrated', 'Manage stress eating',
]

const TRAVEL_FREQ = [
  { id: 'weekly', label: '3-5 days/week', desc: 'Constantly on the road' },
  { id: 'biweekly', label: '1-2 trips/week', desc: 'Heavy but some home days' },
  { id: 'monthly', label: 'A few trips/month', desc: 'Mix of field and desk' },
  { id: 'occasional', label: 'Occasional travel', desc: 'Mostly based in one place' },
]

const SLEEP_PATTERNS = [
  { id: 'irregular', label: 'Totally irregular', desc: 'Different every day' },
  { id: 'late', label: 'Night owl', desc: 'Usually up past midnight' },
  { id: 'early', label: 'Early riser', desc: 'Up before 6am most days' },
  { id: 'split', label: 'Split sleeper', desc: 'Naps + shorter nights' },
  { id: 'normal', label: 'Fairly regular', desc: '11pm-7am most nights' },
]

const CAFFEINE_HABITS = [
  { id: 'heavy', label: '4+ cups/day' },
  { id: 'moderate', label: '2-3 cups/day' },
  { id: 'light', label: '1 cup/day' },
  { id: 'none', label: 'No caffeine' },
  { id: 'energy-drinks', label: 'Energy drinks mostly' },
]

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState({
    name: '',
    dietaryRestrictions: [],
    healthGoals: [],
    travelFrequency: '',
    sleepPattern: '',
    caffeineHabit: '',
    sensitivities: '',
    homeBase: '',
  })

  const toggleArray = (field, value) => {
    setData((prev) => {
      const arr = prev[field]
      if (value === 'No restrictions' && field === 'dietaryRestrictions') {
        return { ...prev, [field]: arr.includes(value) ? [] : [value] }
      }
      const filtered = arr.filter((v) => v !== 'No restrictions')
      return {
        ...prev,
        [field]: filtered.includes(value)
          ? filtered.filter((v) => v !== value)
          : [...filtered, value],
      }
    })
  }

  const steps = [
    // Step 0: Welcome + Name
    <div key="welcome" className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome to FieldFit</h1>
        <p className="text-gray-500 mt-2 text-sm leading-relaxed">
          Health coaching built for the chaos of field journalism. Let's personalize your experience in about 60 seconds.
        </p>
      </div>
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-2">
          What should I call you?
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => setData((p) => ({ ...p, name: e.target.value }))}
          placeholder="First name"
          className="w-full bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3 text-white text-lg outline-none focus:border-green-900/60 placeholder-gray-700"
          autoFocus
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-2">
          Home base timezone
        </label>
        <input
          type="text"
          value={data.homeBase}
          onChange={(e) => setData((p) => ({ ...p, homeBase: e.target.value }))}
          placeholder="e.g. Eastern, Pacific, Central Europe..."
          className="w-full bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3 text-white outline-none focus:border-green-900/60 placeholder-gray-700 text-sm"
        />
      </div>
    </div>,

    // Step 1: Dietary
    <div key="dietary" className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold">Dietary needs</h2>
        <p className="text-gray-500 text-sm mt-1">Select all that apply. This shapes every recommendation.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {DIETARY_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => toggleArray('dietaryRestrictions', opt)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              data.dietaryRestrictions.includes(opt)
                ? 'bg-green-500 text-black shadow-lg shadow-green-900/30'
                : 'bg-[#111] border border-[#1e1e1e] text-gray-500 hover:border-[#333]'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-widest font-semibold block mb-2">
          Allergies or sensitivities
        </label>
        <input
          type="text"
          value={data.sensitivities}
          onChange={(e) => setData((p) => ({ ...p, sensitivities: e.target.value }))}
          placeholder="e.g. lactose intolerant, shellfish allergy, IBS..."
          className="w-full bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3 text-white outline-none focus:border-green-900/60 placeholder-gray-700 text-sm"
        />
      </div>
    </div>,

    // Step 2: Goals
    <div key="goals" className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold">Health goals</h2>
        <p className="text-gray-500 text-sm mt-1">Pick your top priorities. We'll weigh advice toward these.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {GOAL_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => toggleArray('healthGoals', opt)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              data.healthGoals.includes(opt)
                ? 'bg-green-500 text-black shadow-lg shadow-green-900/30'
                : 'bg-[#111] border border-[#1e1e1e] text-gray-500 hover:border-[#333]'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>,

    // Step 3: Lifestyle
    <div key="lifestyle" className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold">Your rhythm</h2>
        <p className="text-gray-500 text-sm mt-1">So I can calibrate advice to your actual life.</p>
      </div>

      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">Travel frequency</p>
        <div className="space-y-2">
          {TRAVEL_FREQ.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setData((p) => ({ ...p, travelFrequency: opt.id }))}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                data.travelFrequency === opt.id
                  ? 'bg-green-500/10 border border-green-500/40 text-green-400'
                  : 'bg-[#111] border border-[#1e1e1e] text-gray-400 hover:border-[#333]'
              }`}
            >
              <span className="text-sm font-medium block">{opt.label}</span>
              <span className="text-xs text-gray-600 block mt-0.5">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">Sleep pattern</p>
        <div className="space-y-2">
          {SLEEP_PATTERNS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setData((p) => ({ ...p, sleepPattern: opt.id }))}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                data.sleepPattern === opt.id
                  ? 'bg-green-500/10 border border-green-500/40 text-green-400'
                  : 'bg-[#111] border border-[#1e1e1e] text-gray-400 hover:border-[#333]'
              }`}
            >
              <span className="text-sm font-medium block">{opt.label}</span>
              <span className="text-xs text-gray-600 block mt-0.5">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">Caffeine</p>
        <div className="flex flex-wrap gap-2">
          {CAFFEINE_HABITS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setData((p) => ({ ...p, caffeineHabit: opt.id }))}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                data.caffeineHabit === opt.id
                  ? 'bg-green-500 text-black shadow-lg shadow-green-900/30'
                  : 'bg-[#111] border border-[#1e1e1e] text-gray-500 hover:border-[#333]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
  ]

  const canProceed =
    step === 0
      ? data.name.trim().length > 0
      : step === 1
        ? true
        : step === 2
          ? data.healthGoals.length > 0
          : true

  const isLast = step === steps.length - 1

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col max-w-2xl mx-auto">
      {/* Progress */}
      <div className="px-5 pt-5 pb-2">
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= step ? 'bg-green-500' : 'bg-[#1a1a1a]'
              }`}
            />
          ))}
        </div>
        <p className="text-[10px] text-gray-600 mt-2">
          Step {step + 1} of {steps.length}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">{steps[step]}</div>

      {/* Navigation */}
      <div className="px-5 py-4 border-t border-[#1a1a1a] flex gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="px-5 py-3 bg-[#111] border border-[#1e1e1e] text-gray-400 rounded-xl text-sm font-medium hover:border-[#333] transition-all flex items-center gap-1"
          >
            <ChevronLeft size={14} /> Back
          </button>
        )}
        <button
          onClick={() => (isLast ? onComplete(data) : setStep((s) => s + 1))}
          disabled={!canProceed}
          className="flex-1 py-3 bg-green-500 hover:bg-green-400 disabled:bg-[#1a1a1a] disabled:text-gray-700 text-black font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-green-900/30 disabled:shadow-none"
        >
          {isLast ? (
            <>
              <Check size={16} /> Let's go
            </>
          ) : (
            <>
              Continue <ChevronRight size={14} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
