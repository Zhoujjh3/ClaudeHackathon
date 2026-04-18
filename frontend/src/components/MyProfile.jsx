import { useState } from 'react'
import {
  User, Target, Plane, Coffee, AlertTriangle,
  Plus, ChevronDown, Loader2, Globe,
  Calendar, Sparkles, RotateCcw, Check,
  Moon as MoonIcon, Sun, Download, ShoppingBag, X,
} from 'lucide-react'
import axios from 'axios'

const DIETARY_OPTIONS = ['Vegetarian','Vegan','Gluten-free','Dairy-free','Halal','Kosher','Pescatarian','Keto','No restrictions']
const GOAL_OPTIONS = ['Sustained energy','Better sleep','Weight management','Mental clarity','Gut health','Reduce caffeine','Eat more whole foods','Stay hydrated','Manage stress eating']

function renderMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<p class="text-[11px] font-semibold text-sage-700 uppercase tracking-wider mt-4 mb-1">$1</p>')
    .replace(/^## (.+)$/gm, '<p class="text-sm font-bold mt-3 mb-1">$1</p>')
    .replace(/^- (.+)$/gm, '<div class="flex gap-2 py-0.5"><span class="text-sage-500 mt-0.5 flex-shrink-0">•</span><span>$1</span></div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-2 py-0.5"><span class="text-sage-600 font-semibold flex-shrink-0">$1.</span><span>$2</span></div>')
    .replace(/\n\n+/g, '<br />').replace(/\n/g, '<br />')
}

function Section({ title, icon: Icon, children, defaultOpen = false, badge, darkMode }) {
  const [open, setOpen] = useState(defaultOpen)
  const card = darkMode ? 'bg-warm-800 border-warm-700' : 'bg-white border-warm-200'
  return (
    <div className={`border rounded-2xl overflow-hidden shadow-sm ${card}`}>
      <button onClick={() => setOpen(!open)}
        className={`w-full px-5 py-4 flex items-center justify-between transition-colors ${darkMode ? 'hover:bg-warm-700' : 'hover:bg-warm-50'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-warm-700' : 'bg-warm-50'}`}>
            <Icon size={14} className="text-sage-600" />
          </div>
          <span className={`text-sm font-semibold ${darkMode ? 'text-warm-200' : 'text-warm-800'}`}>{title}</span>
          {badge && <span className="text-[10px] bg-sage-50 text-sage-600 px-2 py-0.5 rounded-full font-medium">{badge}</span>}
        </div>
        <div className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <ChevronDown size={14} className={darkMode ? 'text-warm-500' : 'text-warm-300'} />
        </div>
      </button>
      {open && <div className={`px-5 pb-5 border-t pt-4 animate-slide-down ${darkMode ? 'border-warm-700' : 'border-warm-100'}`}>{children}</div>}
    </div>
  )
}

export default function MyProfile({ profile, setProfile, onTravelEntry, apiBase, darkMode, setDarkMode, meals, hydration }) {
  const [travelCity, setTravelCity] = useState('')
  const [travelTimezone, setTravelTimezone] = useState('')
  const [briefing, setBriefing] = useState(null)
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [snackInput, setSnackInput] = useState('')
  const [kitLoading, setKitLoading] = useState(false)

  const textPrimary = darkMode ? 'text-warm-100' : 'text-warm-900'
  const textMuted = darkMode ? 'text-warm-500' : 'text-warm-400'
  const inputBg = darkMode ? 'bg-warm-700 border-warm-600 text-warm-100 placeholder-warm-500' : 'bg-warm-50 border-warm-200 text-warm-800 placeholder-warm-300'
  const pillActive = 'bg-sage-600 text-white shadow-sm'
  const pillInactive = darkMode ? 'bg-warm-700 text-warm-400 hover:bg-warm-600' : 'bg-warm-50 text-warm-500 hover:bg-warm-100'

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
  const addTravelEntry = () => { if (!travelCity.trim()) return; onTravelEntry({ city: travelCity, timezone: travelTimezone || '—' }); setTravelCity(''); setTravelTimezone('') }

  const generateBriefing = async () => {
    setBriefingLoading(true)
    try { const resp = await axios.post(`${apiBase}/api/weekly-briefing`, { profile }); setBriefing(resp.data.briefing) }
    catch { setBriefing("Couldn't generate briefing — check backend connection.") }
    finally { setBriefingLoading(false) }
  }

  const generateSnackKit = async () => {
    setKitLoading(true)
    try {
      const resp = await axios.post(`${apiBase}/api/chat`, {
        messages: [{ role: 'user', content: `Build me a personalized emergency snack kit — items I should always keep in my bag while traveling. Consider my dietary restrictions and goals. List 8-10 specific items with a one-line reason for each. Keep it practical — things I can buy at any airport or convenience store.` }],
        profile,
      })
      const items = resp.data.response.split('\n').filter((l) => l.trim().startsWith('-') || /^\d+\./.test(l.trim())).map((l) => l.replace(/^[-\d.]+\s*/, '').replace(/\*\*/g, '').trim()).filter(Boolean)
      setProfile((prev) => ({ ...prev, snackKit: items.length > 0 ? items : [resp.data.response] }))
    } catch { setProfile((prev) => ({ ...prev, snackKit: ['Could not generate — check backend connection'] })) }
    finally { setKitLoading(false) }
  }

  const addSnackItem = () => { if (!snackInput.trim()) return; setProfile((prev) => ({ ...prev, snackKit: [...(prev.snackKit || []), snackInput.trim()] })); setSnackInput('') }
  const removeSnackItem = (i) => { setProfile((prev) => ({ ...prev, snackKit: (prev.snackKit || []).filter((_, idx) => idx !== i) })) }

  const exportCSV = () => {
    const checkins = profile?.weeklyCheckins || []
    if (checkins.length === 0) return
    const header = 'Date,Energy,Sleep,Meal Quality,Hydration,Notes\n'
    const rows = checkins.map((c) => `${c.date},${c.energy || ''},${c.sleepHours || ''},${c.mealQuality || ''},${c.hydration || ''},"${c.notes || ''}"`).join('\n')
    const mealHeader = '\n\nDate,Time,Meal\n'
    const mealRows = (meals || []).map((m) => `${m.date},${m.time},"${m.text}"`).join('\n')
    const waterHeader = '\n\nDate,Glasses\n'
    const waterRows = Object.entries(hydration || {}).map(([d, c]) => `${d},${c}`).join('\n')
    const blob = new Blob([header + rows + mealHeader + mealRows + waterHeader + waterRows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `fieldfit-data-${new Date().toISOString().split('T')[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const checkins = profile?.weeklyCheckins || []
  const travelLog = profile?.travelLog || []
  const recentCheckins = checkins.slice(-7).reverse()
  const snackKit = profile?.snackKit || []

  return (
    <div className="overflow-y-auto h-[calc(100vh-130px)] px-5 py-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className={`font-display text-xl font-bold ${textPrimary}`}>{profile.name ? `${profile.name}'s Profile` : 'My Profile'}</h1>
          <p className={`text-xs mt-0.5 ${textMuted}`}>Everything FieldFit knows about you</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDarkMode(!darkMode)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${darkMode ? 'bg-warm-700 text-amber-400 hover:bg-warm-600' : 'bg-warm-100 text-warm-500 hover:bg-warm-200'}`}>
            {darkMode ? <Sun size={16} /> : <MoonIcon size={16} />}
          </button>
          <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${darkMode ? 'bg-sage-900 border-sage-700' : 'bg-sage-50 border-sage-200'}`}>
            <span className="text-sage-700 font-bold text-sm">{profile.name ? profile.name[0].toUpperCase() : '?'}</span>
          </div>
        </div>
      </div>

      {/* Weekly Briefing */}
      <div className={`border rounded-2xl p-5 animate-slide-up ${darkMode ? 'bg-sage-900/30 border-sage-700' : 'bg-sage-50 border-sage-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-sage-600" />
            <p className="text-xs font-semibold text-sage-700 uppercase tracking-wider">Weekly Briefing</p>
          </div>
          <button onClick={generateBriefing} disabled={briefingLoading}
            className={`text-xs text-sage-600 hover:text-sage-800 transition-colors flex items-center gap-1 px-3 py-1.5 rounded-full border font-medium ${darkMode ? 'bg-warm-800 border-sage-700' : 'bg-white border-sage-200'}`}>
            {briefingLoading ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
            {briefing ? 'Refresh' : 'Generate'}
          </button>
        </div>
        {briefing
          ? <div className={`text-sm leading-relaxed ${darkMode ? 'text-sage-200' : 'text-warm-700'}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(briefing) }} />
          : <p className={`text-xs ${textMuted}`}>{checkins.length > 2 ? 'Tap Generate for a personalized health summary.' : 'Complete a few daily check-ins first.'}</p>}
      </div>

      {/* Snack Kit */}
      <Section title="Emergency Snack Kit" icon={ShoppingBag} defaultOpen={snackKit.length > 0} badge={snackKit.length > 0 ? `${snackKit.length} items` : null} darkMode={darkMode}>
        <div className="space-y-3">
          <p className={`text-xs ${textMuted}`}>Items to always keep in your bag while traveling.</p>
          {snackKit.length > 0 ? (
            <div className="space-y-1.5">
              {snackKit.map((item, i) => (
                <div key={i} className={`flex items-start gap-2 text-xs py-1.5 group ${i > 0 ? `border-t ${darkMode ? 'border-warm-700' : 'border-warm-100'}` : ''}`}>
                  <span className="text-sage-500 mt-0.5">•</span>
                  <span className={`flex-1 ${darkMode ? 'text-warm-300' : 'text-warm-600'}`}>{item}</span>
                  <button onClick={() => removeSnackItem(i)} className="text-warm-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><X size={12} /></button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex gap-2">
            <input type="text" value={snackInput} onChange={(e) => setSnackInput(e.target.value)}
              placeholder="Add item manually..." onKeyDown={(e) => e.key === 'Enter' && addSnackItem()}
              className={`flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:border-sage-400 transition-colors ${inputBg}`} />
            <button onClick={addSnackItem} disabled={!snackInput.trim()}
              className="px-3 py-2 bg-sage-600 hover:bg-sage-700 disabled:bg-warm-200 disabled:text-warm-400 text-white text-xs font-medium rounded-lg transition-all">Add</button>
          </div>
          <button onClick={generateSnackKit} disabled={kitLoading}
            className={`w-full py-2.5 border border-dashed rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${darkMode ? 'border-sage-700 text-sage-400 hover:border-sage-500' : 'border-sage-300 text-sage-600 hover:border-sage-400 hover:bg-sage-50'}`}>
            {kitLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {snackKit.length > 0 ? 'Regenerate with AI' : 'Generate personalized kit with AI'}
          </button>
        </div>
      </Section>

      {/* Travel Log */}
      <Section title="Travel Log" icon={Globe} defaultOpen={true} badge={travelLog.length > 0 ? `${travelLog.length} trips` : null} darkMode={darkMode}>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input type="text" value={travelCity} onChange={(e) => setTravelCity(e.target.value)}
              placeholder="City" onKeyDown={(e) => e.key === 'Enter' && addTravelEntry()}
              className={`flex-1 border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sage-400 transition-colors ${inputBg}`} />
            <input type="text" value={travelTimezone} onChange={(e) => setTravelTimezone(e.target.value)}
              placeholder="TZ" onKeyDown={(e) => e.key === 'Enter' && addTravelEntry()}
              className={`w-20 border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sage-400 transition-colors ${inputBg}`} />
            <button onClick={addTravelEntry} disabled={!travelCity.trim()}
              className="p-2.5 bg-sage-600 hover:bg-sage-700 disabled:bg-warm-200 disabled:text-warm-400 text-white rounded-xl transition-all shadow-sm"><Plus size={16} /></button>
          </div>
          {travelLog.length > 0 ? (
            <div>{[...travelLog].reverse().slice(0, 10).map((entry, i) => (
              <div key={i} className={`flex items-center gap-3 text-xs py-2.5 ${i > 0 ? `border-t ${darkMode ? 'border-warm-700' : 'border-warm-100'}` : ''}`}>
                <Plane size={12} className="text-blue-500 flex-shrink-0" />
                <span className={`w-14 flex-shrink-0 ${textMuted}`}>{entry.date?.slice(5)}</span>
                <span className={`font-medium ${darkMode ? 'text-warm-200' : 'text-warm-800'}`}>{entry.city}</span>
                <span className={`ml-auto px-2 py-0.5 rounded ${darkMode ? 'bg-warm-700 text-warm-400' : 'bg-warm-50 text-warm-400'}`}>{entry.timezone}</span>
              </div>
            ))}</div>
          ) : <p className={`text-xs ${textMuted}`}>Log your travels so I can factor in timezone shifts.</p>}
        </div>
      </Section>

      {/* Check-ins */}
      {recentCheckins.length > 0 && (
        <Section title="Recent Check-ins" icon={Calendar} badge={`${checkins.length} total`} darkMode={darkMode}>
          <div>{recentCheckins.map((c, i) => (
            <div key={i} className={`flex items-center gap-3 text-xs py-2.5 ${i > 0 ? `border-t ${darkMode ? 'border-warm-700' : 'border-warm-100'}` : ''}`}>
              <span className={`w-12 flex-shrink-0 tabular-nums ${textMuted}`}>{c.date?.slice(5)}</span>
              <div className="flex gap-1.5 flex-wrap">
                {c.energy && <span className={`px-2 py-0.5 rounded-lg ${darkMode ? 'bg-warm-700 text-warm-400' : 'bg-warm-50 text-warm-500'}`}>⚡{c.energy}/5</span>}
                {c.sleepHours && <span className={`px-2 py-0.5 rounded-lg ${darkMode ? 'bg-warm-700 text-warm-400' : 'bg-warm-50 text-warm-500'}`}>😴{c.sleepHours}</span>}
                {c.mealQuality && <span className={`px-2 py-0.5 rounded-lg ${darkMode ? 'bg-warm-700 text-warm-400' : 'bg-warm-50 text-warm-500'}`}>🍽️{c.mealQuality}</span>}
                {c.hydration && <span className={`px-2 py-0.5 rounded-lg ${darkMode ? 'bg-warm-700 text-warm-400' : 'bg-warm-50 text-warm-500'}`}>💧{c.hydration}</span>}
              </div>
            </div>
          ))}</div>
        </Section>
      )}

      {/* Basic Info */}
      <Section title="Basic Info" icon={User} darkMode={darkMode}>
        <div className="space-y-3">
          <div>
            <label className={`text-[10px] font-semibold block mb-1.5 ${textMuted}`}>Name</label>
            <input type="text" value={profile.name || ''} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sage-400 transition-colors ${inputBg}`} />
          </div>
          <div>
            <label className={`text-[10px] font-semibold block mb-1.5 ${textMuted}`}>Home timezone</label>
            <input type="text" value={profile.homeBase || ''} onChange={(e) => setProfile((p) => ({ ...p, homeBase: e.target.value }))}
              placeholder="e.g. Eastern, Pacific..."
              className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sage-400 transition-colors ${inputBg}`} />
          </div>
        </div>
      </Section>

      {/* Dietary */}
      <Section title="Dietary Needs" icon={AlertTriangle} badge={(profile.dietaryRestrictions || []).filter((r) => r !== 'No restrictions').length > 0 ? `${(profile.dietaryRestrictions || []).filter((r) => r !== 'No restrictions').length} active` : null} darkMode={darkMode}>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((opt) => (
              <button key={opt} onClick={() => toggleDietary(opt)}
                className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all duration-200 ${(profile.dietaryRestrictions || []).includes(opt) ? pillActive : pillInactive}`}>{opt}</button>
            ))}
          </div>
          <div>
            <label className={`text-[10px] font-semibold block mb-1.5 ${textMuted}`}>Allergies / sensitivities</label>
            <input type="text" value={profile.sensitivities || ''} onChange={(e) => setProfile((p) => ({ ...p, sensitivities: e.target.value }))}
              placeholder="e.g. lactose intolerant, shellfish..."
              className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sage-400 transition-colors ${inputBg}`} />
          </div>
        </div>
      </Section>

      {/* Goals */}
      <Section title="Health Goals" icon={Target} badge={(profile.healthGoals || []).length > 0 ? `${(profile.healthGoals || []).length} goals` : null} darkMode={darkMode}>
        <div className="flex flex-wrap gap-2">
          {GOAL_OPTIONS.map((opt) => (
            <button key={opt} onClick={() => toggleGoal(opt)}
              className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1 ${(profile.healthGoals || []).includes(opt) ? pillActive : pillInactive}`}>
              {opt}{(profile.healthGoals || []).includes(opt) && <Check size={10} />}
            </button>
          ))}
        </div>
      </Section>

      {/* Lifestyle */}
      <Section title="Lifestyle" icon={Coffee} darkMode={darkMode}>
        <div className="space-y-4">
          {[
            { label: 'Travel frequency', field: 'travelFrequency', options: [{ id: 'weekly', label: '3-5 days/wk' }, { id: 'biweekly', label: '1-2 trips/wk' }, { id: 'monthly', label: 'Few/month' }, { id: 'occasional', label: 'Occasional' }] },
            { label: 'Sleep pattern', field: 'sleepPattern', options: [{ id: 'irregular', label: 'Irregular' }, { id: 'late', label: 'Night owl' }, { id: 'early', label: 'Early riser' }, { id: 'split', label: 'Split sleep' }, { id: 'normal', label: 'Regular' }] },
            { label: 'Caffeine', field: 'caffeineHabit', options: [{ id: 'heavy', label: '4+ cups' }, { id: 'moderate', label: '2-3 cups' }, { id: 'light', label: '1 cup' }, { id: 'none', label: 'None' }, { id: 'energy-drinks', label: 'Energy drinks' }] },
          ].map(({ label, field, options }) => (
            <div key={field}>
              <label className={`text-[10px] font-semibold block mb-2 ${textMuted}`}>{label}</label>
              <div className="flex flex-wrap gap-2">
                {options.map((opt) => (
                  <button key={opt.id} onClick={() => setProfile((p) => ({ ...p, [field]: opt.id }))}
                    className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all duration-200 ${profile[field] === opt.id ? pillActive : pillInactive}`}>{opt.label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Export + Reset */}
      <div className="flex gap-3">
        <button onClick={exportCSV}
          className={`flex-1 py-3 border rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${darkMode ? 'border-warm-700 text-warm-400 hover:text-warm-200 hover:border-warm-600' : 'border-warm-200 text-warm-500 hover:text-warm-700 hover:border-warm-300'}`}>
          <Download size={13} /> Export health data (CSV)
        </button>
      </div>
      <button onClick={() => { if (window.confirm('Reset your profile? This clears all data.')) { localStorage.clear(); window.location.reload() } }}
        className={`w-full py-3 text-xs transition-colors ${darkMode ? 'text-warm-600 hover:text-red-400' : 'text-warm-300 hover:text-red-500'}`}>Reset all data</button>
      <div className="h-4" />
    </div>
  )
}
