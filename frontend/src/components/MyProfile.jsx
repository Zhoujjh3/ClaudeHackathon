import { useState } from 'react'
import {
  User, Target, Plane, Coffee, AlertTriangle,
  Plus, ChevronDown, Loader2, Globe,
  Calendar, Sparkles, RotateCcw, Check,
} from 'lucide-react'
import axios from 'axios'

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free',
  'Halal', 'Kosher', 'Pescatarian', 'Keto', 'No restrictions',
]

const GOAL_OPTIONS = [
  'Sustained energy', 'Better sleep', 'Weight management',
  'Mental clarity', 'Gut health', 'Reduce caffeine',
  'Eat more whole foods', 'Stay hydrated', 'Manage stress eating',
]

function renderMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-warm-900 font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-warm-600">$1</em>')
    .replace(/^### (.+)$/gm, '<p class="text-[11px] font-semibold text-sage-700 uppercase tracking-wider mt-4 mb-1">$1</p>')
    .replace(/^## (.+)$/gm, '<p class="text-sm font-bold text-warm-900 mt-3 mb-1">$1</p>')
    .replace(/^- (.+)$/gm, '<div class="flex gap-2 py-0.5"><span class="text-sage-500 mt-0.5 flex-shrink-0">•</span><span>$1</span></div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-2 py-0.5"><span class="text-sage-600 font-semibold flex-shrink-0">$1.</span><span>$2</span></div>')
    .replace(/\n\n+/g, '<br />')
    .replace(/\n/g, '<br />')
}

function Section({ title, icon: Icon, children, defaultOpen = false, badge }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white border border-warm-200 rounded-2xl overflow-hidden shadow-sm">
      <button onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-warm-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-warm-50 flex items-center justify-center">
            <Icon size={14} className="text-sage-600" />
          </div>
          <span className="text-sm font-semibold text-warm-800">{title}</span>
          {badge && <span className="text-[10px] bg-sage-50 text-sage-600 px-2 py-0.5 rounded-full font-medium">{badge}</span>}
        </div>
        <div className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <ChevronDown size={14} className="text-warm-300" />
        </div>
      </button>
      {open && <div className="px-5 pb-5 border-t border-warm-100 pt-4 animate-slide-down">{children}</div>}
    </div>
  )
}

export default function MyProfile({ profile, setProfile, onTravelEntry, apiBase }) {
  const [travelCity, setTravelCity] = useState('')
  const [travelTimezone, setTravelTimezone] = useState('')
  const [briefing, setBriefing] = useState(null)
  const [briefingLoading, setBriefingLoading] = useState(false)

  const toggleDietary = (opt) => {
    setProfile((prev) => {
      const arr = prev.dietaryRestrictions || []
      if (opt === 'No restrictions') return { ...prev, dietaryRestrictions: arr.includes(opt) ? [] : [opt] }
      const filtered = arr.filter((v) => v !== 'No restrictions')
      return { ...prev, dietaryRestrictions: filtered.includes(opt) ? filtered.filter((v) => v !== opt) : [...filtered, opt] }
    })
  }

  const toggleGoal = (opt) => {
    setProfile((prev) => {
      const arr = prev.healthGoals || []
      return { ...prev, healthGoals: arr.includes(opt) ? arr.filter((v) => v !== opt) : [...arr, opt] }
    })
  }

  const addTravelEntry = () => {
    if (!travelCity.trim()) return
    onTravelEntry({ city: travelCity, timezone: travelTimezone || '—' })
    setTravelCity(''); setTravelTimezone('')
  }

  const generateBriefing = async () => {
    setBriefingLoading(true)
    try { const resp = await axios.post(`${apiBase}/api/weekly-briefing`, { profile }); setBriefing(resp.data.briefing) }
    catch { setBriefing("Couldn't generate briefing right now — check your backend connection.") }
    finally { setBriefingLoading(false) }
  }

  const checkins = profile?.weeklyCheckins || []
  const travelLog = profile?.travelLog || []
  const recentCheckins = checkins.slice(-7).reverse()

  return (
    <div className="overflow-y-auto h-[calc(100vh-130px)] px-5 py-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="font-display text-xl font-bold text-warm-900">{profile.name ? `${profile.name}'s Profile` : 'My Profile'}</h1>
          <p className="text-warm-400 text-xs mt-0.5">Everything FieldFit knows about you</p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-sage-50 border border-sage-200 flex items-center justify-center">
          <span className="text-sage-700 font-bold text-sm">{profile.name ? profile.name[0].toUpperCase() : '?'}</span>
        </div>
      </div>

      {/* Weekly Briefing */}
      <div className="bg-sage-50 border border-sage-200 rounded-2xl p-5 animate-slide-up">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-sage-600" />
            <p className="text-xs font-semibold text-sage-700 uppercase tracking-wider">Weekly Briefing</p>
          </div>
          <button onClick={generateBriefing} disabled={briefingLoading}
            className="text-xs text-sage-600 hover:text-sage-800 transition-colors flex items-center gap-1 bg-white px-3 py-1.5 rounded-full border border-sage-200 font-medium"
          >
            {briefingLoading ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
            {briefing ? 'Refresh' : 'Generate'}
          </button>
        </div>
        {briefing
          ? <div className="text-sm text-warm-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(briefing) }} />
          : <p className="text-xs text-warm-400">{checkins.length > 2 ? 'Tap Generate for a personalized health summary.' : 'Complete a few daily check-ins first.'}</p>
        }
      </div>

      {/* Travel Log */}
      <Section title="Travel Log" icon={Globe} defaultOpen={true} badge={travelLog.length > 0 ? `${travelLog.length} trips` : null}>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input type="text" value={travelCity} onChange={(e) => setTravelCity(e.target.value)}
              placeholder="City" onKeyDown={(e) => e.key === 'Enter' && addTravelEntry()}
              className="flex-1 bg-warm-50 border border-warm-200 rounded-xl px-3 py-2.5 text-sm text-warm-800 outline-none placeholder-warm-300 focus:border-sage-400 transition-colors"
            />
            <input type="text" value={travelTimezone} onChange={(e) => setTravelTimezone(e.target.value)}
              placeholder="TZ" onKeyDown={(e) => e.key === 'Enter' && addTravelEntry()}
              className="w-20 bg-warm-50 border border-warm-200 rounded-xl px-3 py-2.5 text-sm text-warm-800 outline-none placeholder-warm-300 focus:border-sage-400 transition-colors"
            />
            <button onClick={addTravelEntry} disabled={!travelCity.trim()}
              className="p-2.5 bg-sage-600 hover:bg-sage-700 disabled:bg-warm-200 disabled:text-warm-400 text-white rounded-xl transition-all shadow-sm"
            ><Plus size={16} /></button>
          </div>
          {travelLog.length > 0 ? (
            <div>{[...travelLog].reverse().slice(0, 10).map((entry, i) => (
              <div key={i} className={`flex items-center gap-3 text-xs py-2.5 ${i > 0 ? 'border-t border-warm-100' : ''}`}>
                <Plane size={12} className="text-blue-500 flex-shrink-0" />
                <span className="text-warm-400 w-14 flex-shrink-0">{entry.date?.slice(5)}</span>
                <span className="text-warm-800 font-medium">{entry.city}</span>
                <span className="text-warm-400 ml-auto bg-warm-50 px-2 py-0.5 rounded">{entry.timezone}</span>
              </div>
            ))}</div>
          ) : <p className="text-xs text-warm-400">Log your travels so I can factor in timezone shifts.</p>}
        </div>
      </Section>

      {/* Check-ins */}
      {recentCheckins.length > 0 && (
        <Section title="Recent Check-ins" icon={Calendar} badge={`${checkins.length} total`}>
          <div>{recentCheckins.map((c, i) => (
            <div key={i} className={`flex items-center gap-3 text-xs py-2.5 ${i > 0 ? 'border-t border-warm-100' : ''}`}>
              <span className="text-warm-400 w-12 flex-shrink-0 tabular-nums">{c.date?.slice(5)}</span>
              <div className="flex gap-1.5 flex-wrap">
                {c.energy && <span className="bg-warm-50 px-2 py-0.5 rounded-lg text-warm-500">⚡{c.energy}/5</span>}
                {c.sleepHours && <span className="bg-warm-50 px-2 py-0.5 rounded-lg text-warm-500">😴{c.sleepHours}</span>}
                {c.mealQuality && <span className="bg-warm-50 px-2 py-0.5 rounded-lg text-warm-500">🍽️{c.mealQuality}</span>}
                {c.hydration && <span className="bg-warm-50 px-2 py-0.5 rounded-lg text-warm-500">💧{c.hydration}</span>}
              </div>
            </div>
          ))}</div>
        </Section>
      )}

      {/* Basic Info */}
      <Section title="Basic Info" icon={User}>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-warm-400 font-semibold block mb-1.5">Name</label>
            <input type="text" value={profile.name || ''} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              className="w-full bg-warm-50 border border-warm-200 rounded-xl px-3 py-2.5 text-sm text-warm-800 outline-none focus:border-sage-400 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] text-warm-400 font-semibold block mb-1.5">Home timezone</label>
            <input type="text" value={profile.homeBase || ''} onChange={(e) => setProfile((p) => ({ ...p, homeBase: e.target.value }))}
              placeholder="e.g. Eastern, Pacific..."
              className="w-full bg-warm-50 border border-warm-200 rounded-xl px-3 py-2.5 text-sm text-warm-800 outline-none placeholder-warm-300 focus:border-sage-400 transition-colors"
            />
          </div>
        </div>
      </Section>

      {/* Dietary */}
      <Section title="Dietary Needs" icon={AlertTriangle} badge={
        (profile.dietaryRestrictions || []).filter((r) => r !== 'No restrictions').length > 0
          ? `${(profile.dietaryRestrictions || []).filter((r) => r !== 'No restrictions').length} active` : null
      }>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((opt) => (
              <button key={opt} onClick={() => toggleDietary(opt)}
                className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                  (profile.dietaryRestrictions || []).includes(opt)
                    ? 'bg-sage-600 text-white shadow-sm'
                    : 'bg-warm-50 text-warm-500 hover:bg-warm-100'
                }`}
              >{opt}</button>
            ))}
          </div>
          <div>
            <label className="text-[10px] text-warm-400 font-semibold block mb-1.5">Allergies / sensitivities</label>
            <input type="text" value={profile.sensitivities || ''} onChange={(e) => setProfile((p) => ({ ...p, sensitivities: e.target.value }))}
              placeholder="e.g. lactose intolerant, shellfish..."
              className="w-full bg-warm-50 border border-warm-200 rounded-xl px-3 py-2.5 text-sm text-warm-800 outline-none placeholder-warm-300 focus:border-sage-400 transition-colors"
            />
          </div>
        </div>
      </Section>

      {/* Goals */}
      <Section title="Health Goals" icon={Target} badge={(profile.healthGoals || []).length > 0 ? `${(profile.healthGoals || []).length} goals` : null}>
        <div className="flex flex-wrap gap-2">
          {GOAL_OPTIONS.map((opt) => (
            <button key={opt} onClick={() => toggleGoal(opt)}
              className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                (profile.healthGoals || []).includes(opt)
                  ? 'bg-sage-600 text-white shadow-sm'
                  : 'bg-warm-50 text-warm-500 hover:bg-warm-100'
              }`}
            >{opt}{(profile.healthGoals || []).includes(opt) && <Check size={10} />}</button>
          ))}
        </div>
      </Section>

      {/* Lifestyle */}
      <Section title="Lifestyle" icon={Coffee}>
        <div className="space-y-4">
          {[
            { label: 'Travel frequency', field: 'travelFrequency', options: [{ id: 'weekly', label: '3-5 days/wk' }, { id: 'biweekly', label: '1-2 trips/wk' }, { id: 'monthly', label: 'Few/month' }, { id: 'occasional', label: 'Occasional' }] },
            { label: 'Sleep pattern', field: 'sleepPattern', options: [{ id: 'irregular', label: 'Irregular' }, { id: 'late', label: 'Night owl' }, { id: 'early', label: 'Early riser' }, { id: 'split', label: 'Split sleep' }, { id: 'normal', label: 'Regular' }] },
            { label: 'Caffeine', field: 'caffeineHabit', options: [{ id: 'heavy', label: '4+ cups' }, { id: 'moderate', label: '2-3 cups' }, { id: 'light', label: '1 cup' }, { id: 'none', label: 'None' }, { id: 'energy-drinks', label: 'Energy drinks' }] },
          ].map(({ label, field, options }) => (
            <div key={field}>
              <label className="text-[10px] text-warm-400 font-semibold block mb-2">{label}</label>
              <div className="flex flex-wrap gap-2">
                {options.map((opt) => (
                  <button key={opt.id} onClick={() => setProfile((p) => ({ ...p, [field]: opt.id }))}
                    className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                      profile[field] === opt.id
                        ? 'bg-sage-600 text-white shadow-sm'
                        : 'bg-warm-50 text-warm-500 hover:bg-warm-100'
                    }`}
                  >{opt.label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Reset */}
      <button onClick={() => { if (window.confirm('Reset your profile? This clears all data.')) { localStorage.clear(); window.location.reload() } }}
        className="w-full py-3 text-xs text-warm-300 hover:text-red-500 transition-colors"
      >Reset all data</button>

      <div className="h-4" />
    </div>
  )
}
