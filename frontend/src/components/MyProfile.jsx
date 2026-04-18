import { useState } from 'react'
import { User, Target, Plane, Coffee, AlertTriangle, Plus, ChevronDown, Loader2, Globe, Calendar, Sparkles, RotateCcw, Check, Moon, Sun, Download, ShoppingBag, X } from 'lucide-react'
import axios from 'axios'

const DIET = ['Vegetarian','Vegan','Gluten-free','Dairy-free','Halal','Kosher','Pescatarian','Keto','No restrictions']
const GOALS = ['Sustained energy','Better sleep','Weight management','Mental clarity','Gut health','Reduce caffeine','Eat more whole foods','Stay hydrated','Manage stress eating']

function md(t) {
  return t.replace(/\*\*(.*?)\*\*/g,'<strong class="font-semibold">$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>')
    .replace(/^- (.+)$/gm,'<div class="flex gap-1.5 py-0.5"><span class="text-emerald-400">·</span><span>$1</span></div>')
    .replace(/^(\d+)\. (.+)$/gm,'<div class="flex gap-1.5 py-0.5"><span class="text-emerald-500 font-medium">$1.</span><span>$2</span></div>')
    .replace(/\n\n+/g,'<br/>').replace(/\n/g,'<br/>')
}

function Sec({ title, icon: I, children, open: def = false, badge, dark }) {
  const [o, setO] = useState(def)
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setO(!o)} className={`w-full px-4 py-3.5 flex items-center justify-between transition-colors ${dark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-50'}`}>
        <div className="flex items-center gap-2.5">
          <I size={14} className="text-emerald-500" />
          <span className={`text-sm font-medium ${dark ? 'text-neutral-200' : 'text-neutral-800'}`}>{title}</span>
          {badge && <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">{badge}</span>}
        </div>
        <ChevronDown size={13} className={`text-neutral-400 transition-transform duration-200 ${o ? 'rotate-180' : ''}`} />
      </button>
      {o && <div className={`px-4 pb-4 border-t pt-3 animate-slide-down ${dark ? 'border-neutral-800' : 'border-neutral-100'}`}>{children}</div>}
    </div>
  )
}

export default function MyProfile({ profile: p, setProfile: setP, onTravel, api, dark, setDark, allMeals, allWater }) {
  const [city, setCity] = useState('')
  const [tz, setTz] = useState('')
  const [brief, setBrief] = useState(null)
  const [bLoad, setBLoad] = useState(false)
  const [snkIn, setSnkIn] = useState('')
  const [kLoad, setKLoad] = useState(false)

  const t1 = dark ? 'text-white' : 'text-neutral-900'
  const t3 = dark ? 'text-neutral-500' : 'text-neutral-400'
  const div = dark ? 'border-neutral-800' : 'border-neutral-100'

  const togD = (o) => setP(prev => { const a = prev.dietaryRestrictions || []; if (o === 'No restrictions') return { ...prev, dietaryRestrictions: a.includes(o) ? [] : [o] }; const f = a.filter(x => x !== 'No restrictions'); return { ...prev, dietaryRestrictions: f.includes(o) ? f.filter(x => x !== o) : [...f, o] } })
  const togG = (o) => setP(prev => { const a = prev.healthGoals || []; return { ...prev, healthGoals: a.includes(o) ? a.filter(x => x !== o) : [...a, o] } })
  const addTravel = () => { if (!city.trim()) return; onTravel({ city, timezone: tz || '—' }); setCity(''); setTz('') }

  const genBrief = async () => { setBLoad(true); try { const r = await axios.post(`${api}/api/weekly-briefing`, { profile: p }); setBrief(r.data.briefing) } catch { setBrief("Couldn't generate — check backend.") } finally { setBLoad(false) } }

  const genKit = async () => {
    setKLoad(true)
    try {
      const r = await axios.post(`${api}/api/chat`, { messages: [{ role: 'user', content: 'Build me a personalized emergency snack kit — 8-10 items I should always carry while traveling. Consider my dietary restrictions. Practical items from any airport or convenience store. One line each.' }], profile: p })
      const items = r.data.response.split('\n').filter(l => l.trim().startsWith('-') || /^\d+\./.test(l.trim())).map(l => l.replace(/^[-\d.]+\s*/, '').replace(/\*\*/g, '').trim()).filter(Boolean)
      setP(prev => ({ ...prev, snackKit: items.length > 0 ? items : [r.data.response] }))
    } catch { setP(prev => ({ ...prev, snackKit: ['Could not generate — check backend'] })) }
    finally { setKLoad(false) }
  }

  const exportCSV = () => {
    const ck = p?.weeklyCheckins || []; if (!ck.length) return
    let csv = 'Date,Energy,Sleep,Meals,Water,Notes\n'
    csv += ck.map(c => `${c.date},${c.energy||''},${c.sleepHours||''},${c.mealQuality||''},${c.hydration||''},"${c.notes||''}"`).join('\n')
    csv += '\n\nDate,Time,Meal\n' + (allMeals || []).map(m => `${m.date},${m.time},"${m.text}"`).join('\n')
    csv += '\n\nDate,Glasses\n' + Object.entries(allWater || {}).map(([d, c]) => `${d},${c}`).join('\n')
    const b = new Blob([csv], { type: 'text/csv' }); const u = URL.createObjectURL(b)
    Object.assign(document.createElement('a'), { href: u, download: `fieldfit-${new Date().toISOString().split('T')[0]}.csv` }).click()
    URL.revokeObjectURL(u)
  }

  const ck = p?.weeklyCheckins || [], tl = p?.travelLog || [], kit = p?.snackKit || []

  return (
    <div className="overflow-y-auto h-[calc(100vh-120px)] px-4 py-4 space-y-3">
      <div className="flex items-center justify-between px-1 animate-fade-in">
        <div>
          <h1 className={`text-lg font-bold ${t1}`}>{p.name || 'Profile'}</h1>
          <p className={`text-[11px] ${t3}`}>Your FieldFit settings</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setDark(!dark)} className={`btn-ghost w-8 h-8 rounded-lg flex items-center justify-center`}>
            {dark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
          </button>
        </div>
      </div>

      {/* Briefing */}
      <div className={`card-sm p-4 ${dark ? 'bg-emerald-950/20 border-emerald-900/30' : 'bg-emerald-50/50 border-emerald-100/60'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5"><Sparkles size={12} className="text-emerald-600" /><span className="label text-emerald-600">Weekly briefing</span></div>
          <button onClick={genBrief} disabled={bLoad} className="btn-ghost px-2.5 py-1 rounded-full text-[10px] flex items-center gap-1">
            {bLoad ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}{brief ? 'Refresh' : 'Generate'}
          </button>
        </div>
        {brief ? <div className={`text-[13px] leading-relaxed ${dark ? 'text-emerald-200/80' : 'text-neutral-600'}`} dangerouslySetInnerHTML={{ __html: md(brief) }} />
          : <p className={`text-xs ${t3}`}>{ck.length > 2 ? 'Tap Generate for a personalized summary.' : 'Complete a few check-ins first.'}</p>}
      </div>

      {/* Snack Kit */}
      <Sec title="Emergency Snack Kit" icon={ShoppingBag} open={kit.length > 0} badge={kit.length > 0 ? kit.length : null} dark={dark}>
        <div className="space-y-2">
          {kit.length > 0 && <div className="space-y-1">{kit.map((item, i) => (
            <div key={i} className={`flex items-start gap-2 text-xs py-1 group ${i > 0 ? `border-t ${div}` : ''}`}>
              <span className="text-emerald-400 mt-0.5">·</span>
              <span className={`flex-1 ${dark ? 'text-neutral-300' : 'text-neutral-600'}`}>{item}</span>
              <button onClick={() => setP(prev => ({ ...prev, snackKit: kit.filter((_, j) => j !== i) }))} className="text-neutral-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><X size={11} /></button>
            </div>
          ))}</div>}
          <div className="flex gap-1.5">
            <input value={snkIn} onChange={e => setSnkIn(e.target.value)} placeholder="Add item..." onKeyDown={e => { if (e.key === 'Enter' && snkIn.trim()) { setP(prev => ({ ...prev, snackKit: [...kit, snkIn.trim()] })); setSnkIn('') } }} className="input flex-1 text-xs py-1.5" />
            <button onClick={() => { if (snkIn.trim()) { setP(prev => ({ ...prev, snackKit: [...kit, snkIn.trim()] })); setSnkIn('') } }} className="btn-primary px-2.5 py-1.5 text-[10px]">Add</button>
          </div>
          <button onClick={genKit} disabled={kLoad} className={`w-full py-2 border border-dashed rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition-all ${dark ? 'border-emerald-800 text-emerald-400' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
            {kLoad ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}{kit.length ? 'Regenerate with AI' : 'Generate with AI'}
          </button>
        </div>
      </Sec>

      <Sec title="Travel Log" icon={Globe} open={true} badge={tl.length || null} dark={dark}>
        <div className="space-y-2">
          <div className="flex gap-1.5">
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="City" onKeyDown={e => e.key === 'Enter' && addTravel()} className="input flex-1 text-xs py-1.5" />
            <input value={tz} onChange={e => setTz(e.target.value)} placeholder="TZ" onKeyDown={e => e.key === 'Enter' && addTravel()} className="input w-16 text-xs py-1.5" />
            <button onClick={addTravel} disabled={!city.trim()} className="btn-primary p-1.5 disabled:opacity-30"><Plus size={13} /></button>
          </div>
          {tl.length > 0 ? [...tl].reverse().slice(0, 8).map((e, i) => (
            <div key={i} className={`flex items-center gap-2 text-xs py-1.5 ${i > 0 ? `border-t ${div}` : ''}`}>
              <Plane size={10} className="text-blue-500" />
              <span className={t3}>{e.date?.slice(5)}</span>
              <span className={`font-medium ${dark ? 'text-neutral-200' : 'text-neutral-800'}`}>{e.city}</span>
              <span className={`ml-auto text-[10px] ${t3}`}>{e.timezone}</span>
            </div>
          )) : <p className={`text-xs ${t3}`}>Log travels to factor in timezone shifts.</p>}
        </div>
      </Sec>

      {ck.length > 0 && (
        <Sec title="Check-ins" icon={Calendar} badge={ck.length} dark={dark}>
          {ck.slice(-7).reverse().map((c, i) => (
            <div key={i} className={`flex items-center gap-2 text-[11px] py-1.5 ${i > 0 ? `border-t ${div}` : ''}`}>
              <span className={`tabular-nums ${t3}`}>{c.date?.slice(5)}</span>
              <div className="flex gap-1 flex-wrap">
                {c.energy && <span className={`pill-inactive pill`}>E:{c.energy}/5</span>}
                {c.sleepHours && <span className={`pill-inactive pill`}>S:{c.sleepHours}</span>}
                {c.mealQuality && <span className={`pill-inactive pill`}>{c.mealQuality}</span>}
              </div>
            </div>
          ))}
        </Sec>
      )}

      <Sec title="Basic Info" icon={User} dark={dark}>
        <div className="space-y-2">
          <div><label className="label block mb-1">Name</label><input value={p.name || ''} onChange={e => setP(prev => ({ ...prev, name: e.target.value }))} className="input w-full text-sm" /></div>
          <div><label className="label block mb-1">Home timezone</label><input value={p.homeBase || ''} onChange={e => setP(prev => ({ ...prev, homeBase: e.target.value }))} placeholder="e.g. Eastern" className="input w-full text-sm" /></div>
        </div>
      </Sec>

      <Sec title="Dietary" icon={AlertTriangle} badge={(p.dietaryRestrictions || []).filter(r => r !== 'No restrictions').length || null} dark={dark}>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">{DIET.map(o => <button key={o} onClick={() => togD(o)} className={`pill ${(p.dietaryRestrictions || []).includes(o) ? 'pill-active' : 'pill-inactive'}`}>{o}</button>)}</div>
          <div><label className="label block mb-1">Sensitivities</label><input value={p.sensitivities || ''} onChange={e => setP(prev => ({ ...prev, sensitivities: e.target.value }))} placeholder="e.g. lactose, shellfish..." className="input w-full text-xs" /></div>
        </div>
      </Sec>

      <Sec title="Goals" icon={Target} badge={(p.healthGoals || []).length || null} dark={dark}>
        <div className="flex flex-wrap gap-1.5">{GOALS.map(o => <button key={o} onClick={() => togG(o)} className={`pill flex items-center gap-1 ${(p.healthGoals || []).includes(o) ? 'pill-active' : 'pill-inactive'}`}>{o}{(p.healthGoals || []).includes(o) && <Check size={9} />}</button>)}</div>
      </Sec>

      <Sec title="Lifestyle" icon={Coffee} dark={dark}>
        <div className="space-y-3">
          {[
            { l: 'Travel', f: 'travelFrequency', o: [{ id: 'weekly', l: '3-5d/wk' }, { id: 'biweekly', l: '1-2/wk' }, { id: 'monthly', l: 'Few/mo' }, { id: 'occasional', l: 'Rare' }] },
            { l: 'Sleep', f: 'sleepPattern', o: [{ id: 'irregular', l: 'Irregular' }, { id: 'late', l: 'Night owl' }, { id: 'early', l: 'Early' }, { id: 'split', l: 'Split' }, { id: 'normal', l: 'Regular' }] },
            { l: 'Caffeine', f: 'caffeineHabit', o: [{ id: 'heavy', l: '4+' }, { id: 'moderate', l: '2-3' }, { id: 'light', l: '1' }, { id: 'none', l: 'None' }, { id: 'energy-drinks', l: 'Energy' }] },
          ].map(({ l, f, o }) => (
            <div key={f}><label className="label block mb-1.5">{l}</label><div className="flex flex-wrap gap-1.5">{o.map(opt => <button key={opt.id} onClick={() => setP(prev => ({ ...prev, [f]: opt.id }))} className={`pill ${p[f] === opt.id ? 'pill-active' : 'pill-inactive'}`}>{opt.l}</button>)}</div></div>
          ))}
        </div>
      </Sec>

      <button onClick={exportCSV} className={`card-sm w-full py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${dark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-500 hover:text-neutral-700'}`}>
        <Download size={12} /> Export data (CSV)
      </button>
      <button onClick={() => { if (confirm('Reset all data?')) { localStorage.clear(); location.reload() } }} className={`w-full py-2 text-[11px] ${t3} hover:text-red-500 transition-colors`}>Reset all data</button>
      <div className="h-3" />
    </div>
  )
}
