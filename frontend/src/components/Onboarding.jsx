import { useState } from 'react'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'
import Logo from './Logo'

const DIET = ['Vegetarian','Vegan','Gluten-free','Dairy-free','Halal','Kosher','Pescatarian','Keto','No restrictions']
const GOALS = ['Sustained energy','Better sleep','Weight management','Mental clarity','Gut health','Reduce caffeine','Eat more whole foods','Stay hydrated','Manage stress eating']
const TRAVEL = [
  { id: 'weekly', l: '3–5 days/week', d: 'Constantly on the road' },
  { id: 'biweekly', l: '1–2 trips/week', d: 'Heavy but some home days' },
  { id: 'monthly', l: 'A few trips/month', d: 'Mix of field and desk' },
  { id: 'occasional', l: 'Occasional', d: 'Mostly one location' },
]
const SLEEP = ['Irregular','Night owl','Early riser','Split sleeper','Regular']
const CAFF = ['4+ cups','2–3 cups','1 cup','None','Energy drinks']

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [d, setD] = useState({ name: '', dietaryRestrictions: [], healthGoals: [], travelFrequency: '', sleepPattern: '', caffeineHabit: '', sensitivities: '', homeBase: '' })

  const toggle = (f, v) => setD(p => {
    const a = p[f]
    if (v === 'No restrictions' && f === 'dietaryRestrictions') return { ...p, [f]: a.includes(v) ? [] : [v] }
    const fil = a.filter(x => x !== 'No restrictions')
    return { ...p, [f]: fil.includes(v) ? fil.filter(x => x !== v) : [...fil, v] }
  })

  const steps = [
    <div key={0} className="space-y-8 animate-fade-in">
      <div className="text-center pt-6">
        <Logo size={56} className="mx-auto mb-5 rounded-2xl shadow-lg shadow-emerald-900/10" />
        <h1 className="text-2xl font-bold text-neutral-900">Welcome to FieldFit</h1>
        <p className="text-neutral-500 mt-2 text-sm max-w-xs mx-auto">Health coaching for the unpredictable life of field journalism. About 60 seconds to set up.</p>
      </div>
      <div className="space-y-3">
        <div>
          <label className="label block mb-1.5">Your name</label>
          <input value={d.name} onChange={e => setD(p => ({ ...p, name: e.target.value }))} placeholder="First name" className="input w-full text-lg py-3.5" autoFocus />
        </div>
        <div>
          <label className="label block mb-1.5">Home timezone</label>
          <input value={d.homeBase} onChange={e => setD(p => ({ ...p, homeBase: e.target.value }))} placeholder="e.g. Eastern, Pacific, CET..." className="input w-full" />
        </div>
      </div>
    </div>,

    <div key={1} className="space-y-5 animate-fade-in">
      <div><h2 className="text-xl font-bold text-neutral-900">Dietary needs</h2><p className="text-neutral-500 text-sm mt-1">Select all that apply.</p></div>
      <div className="flex flex-wrap gap-2">
        {DIET.map(o => <button key={o} onClick={() => toggle('dietaryRestrictions', o)} className={`pill ${d.dietaryRestrictions.includes(o) ? 'pill-active' : 'pill-inactive'}`}>{o}</button>)}
      </div>
      <div>
        <label className="label block mb-1.5">Allergies or sensitivities</label>
        <input value={d.sensitivities} onChange={e => setD(p => ({ ...p, sensitivities: e.target.value }))} placeholder="e.g. lactose intolerant, shellfish..." className="input w-full" />
      </div>
    </div>,

    <div key={2} className="space-y-5 animate-fade-in">
      <div><h2 className="text-xl font-bold text-neutral-900">Health goals</h2><p className="text-neutral-500 text-sm mt-1">Pick your priorities.</p></div>
      <div className="space-y-1.5">
        {GOALS.map(o => (
          <button key={o} onClick={() => toggle('healthGoals', o)}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${d.healthGoals.includes(o) ? 'bg-emerald-50 border-2 border-emerald-400 text-emerald-800' : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300'}`}>
            {o}{d.healthGoals.includes(o) && <Check size={14} className="text-emerald-600" />}
          </button>
        ))}
      </div>
    </div>,

    <div key={3} className="space-y-6 animate-fade-in">
      <div><h2 className="text-xl font-bold text-neutral-900">Your rhythm</h2><p className="text-neutral-500 text-sm mt-1">Calibrates advice to your life.</p></div>
      <div>
        <p className="label mb-2">Travel frequency</p>
        <div className="space-y-1.5">
          {TRAVEL.map(o => (
            <button key={o.id} onClick={() => setD(p => ({ ...p, travelFrequency: o.id }))}
              className={`w-full text-left px-4 py-2.5 rounded-xl transition-all ${d.travelFrequency === o.id ? 'bg-emerald-50 border-2 border-emerald-400 text-emerald-800' : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300'}`}>
              <span className="text-sm font-medium block">{o.l}</span>
              <span className="text-[11px] text-neutral-400">{o.d}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="label mb-2">Sleep pattern</p>
        <div className="flex flex-wrap gap-2">{SLEEP.map(o => { const id = o.toLowerCase().replace(/ /g,'-'); return <button key={id} onClick={() => setD(p => ({ ...p, sleepPattern: id }))} className={`pill ${d.sleepPattern === id ? 'pill-active' : 'pill-inactive'}`}>{o}</button> })}</div>
      </div>
      <div>
        <p className="label mb-2">Caffeine</p>
        <div className="flex flex-wrap gap-2">{CAFF.map(o => { const id = o.toLowerCase().replace(/[–+ ]/g,'-'); return <button key={id} onClick={() => setD(p => ({ ...p, caffeineHabit: id }))} className={`pill ${d.caffeineHabit === id ? 'pill-active' : 'pill-inactive'}`}>{o}</button> })}</div>
      </div>
    </div>,
  ]

  const ok = step === 0 ? d.name.trim() : step === 2 ? d.healthGoals.length > 0 : true

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col max-w-lg mx-auto">
      <div className="px-5 pt-5 pb-2">
        <div className="flex gap-1.5">{steps.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-emerald-500' : 'bg-neutral-200'}`} />)}</div>
        <p className="text-[11px] text-neutral-400 mt-2 font-medium">Step {step + 1} of {steps.length}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-3">{steps[step]}</div>
      <div className="px-5 py-4 flex gap-3">
        {step > 0 && <button onClick={() => setStep(s => s - 1)} className="btn-ghost px-5 py-3 text-sm flex items-center gap-1"><ChevronLeft size={14} />Back</button>}
        <button onClick={() => step === steps.length - 1 ? onComplete(d) : setStep(s => s + 1)} disabled={!ok}
          className="btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-lg shadow-emerald-600/15">
          {step === steps.length - 1 ? <><Check size={15} />Let's go</> : <>Continue<ChevronRight size={14} /></>}
        </button>
      </div>
    </div>
  )
}
