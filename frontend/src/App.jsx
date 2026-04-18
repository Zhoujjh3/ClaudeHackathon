import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import ChatCoach from './components/ChatCoach'
import MyProfile from './components/MyProfile'
import Onboarding from './components/Onboarding'
import Logo from './components/Logo'
import { Home, MessageCircle, User } from 'lucide-react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL ?? ''
const PK = 'fieldfit_profile'

const DEFAULTS = {
  name: '', dietaryRestrictions: [], healthGoals: [], travelFrequency: '',
  sleepPattern: '', caffeineHabit: '', sensitivities: '', homeBase: '',
  onboarded: false, weeklyCheckins: [], travelLog: [], snackKit: [],
}

function today() { return new Date().toISOString().split('T')[0] }

export default function App() {
  const [tab, setTab] = useState('home')
  const [ctx, setCtx] = useState({ location: '', energyLevel: 'normal' })
  const [msg, setMsg] = useState(null)
  const [calOk, setCalOk] = useState(false)
  const [calEv, setCalEv] = useState(null)
  const [dark, setDark] = useState(() => localStorage.getItem('ff_theme') === 'dark')
  const [water, setWater] = useState(() => { try { return JSON.parse(localStorage.getItem('ff_water')) || {} } catch { return {} } })
  const [meals, setMeals] = useState(() => { try { return JSON.parse(localStorage.getItem('ff_meals')) || [] } catch { return [] } })
  const [profile, setProfile] = useState(() => { try { const s = localStorage.getItem(PK); return s ? { ...DEFAULTS, ...JSON.parse(s) } : DEFAULTS } catch { return DEFAULTS } })

  useEffect(() => { localStorage.setItem(PK, JSON.stringify(profile)) }, [profile])
  useEffect(() => { localStorage.setItem('ff_water', JSON.stringify(water)) }, [water])
  useEffect(() => { localStorage.setItem('ff_meals', JSON.stringify(meals)) }, [meals])
  useEffect(() => { localStorage.setItem('ff_theme', dark ? 'dark' : 'light'); document.documentElement.classList.toggle('dark', dark) }, [dark])

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('calendar') === 'connected') { window.history.replaceState({}, '', '/'); fetchCal() }
    else { axios.get(`${API}/api/calendar/status`).then(({ data }) => { if (data.connected) { setCalOk(true); fetchCal() } }).catch(() => {}) }
  }, [])

  const fetchCal = () => axios.get(`${API}/api/calendar/events`).then(({ data }) => { setCalOk(true); setCalEv(data.events) }).catch(() => { setCalOk(false); setCalEv(null) })

  const w = water[today()] || 0
  const addW = () => setWater(p => ({ ...p, [today()]: (p[today()] || 0) + 1 }))
  const subW = () => setWater(p => ({ ...p, [today()]: Math.max(0, (p[today()] || 0) - 1) }))
  const todayM = meals.filter(m => m.date === today())
  const logMeal = (t) => setMeals(p => [...p.slice(-50), { date: today(), time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), text: t }])

  if (!profile.onboarded) return <Onboarding onComplete={(d) => setProfile(p => ({ ...p, ...d, onboarded: true }))} />

  const tabs = [
    { id: 'home', label: 'Home', Icon: Home },
    { id: 'coach', label: 'Coach', Icon: MessageCircle },
    { id: 'profile', label: 'Profile', Icon: User },
  ]

  return (
    <div className={`min-h-screen ${dark ? 'bg-neutral-950' : 'bg-neutral-50'} flex flex-col max-w-lg mx-auto transition-colors`}>
      <header className={`px-5 pt-4 pb-3 flex items-center justify-between sticky top-0 z-20 backdrop-blur-xl ${dark ? 'bg-neutral-950/80' : 'bg-neutral-50/80'}`}>
        <div className="flex items-center gap-2.5">
          <Logo size={32} className="rounded-lg" />
          <span className={`text-base font-bold tracking-tight ${dark ? 'text-white' : 'text-neutral-900'}`}>FieldFit</span>
        </div>
        <span className={`text-[11px] font-medium ${dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
          {new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </span>
      </header>

      <main className="flex-1 overflow-hidden">
        {tab === 'home' && <Dashboard ctx={ctx} setCtx={setCtx} go={(m) => { setMsg(m); setTab('coach') }} profile={profile} onCheckin={(c) => setProfile(p => ({ ...p, weeklyCheckins: [...(p.weeklyCheckins || []).slice(-30), { ...c, date: today() }] }))} dark={dark} calOk={calOk} calEv={calEv} fetchCal={fetchCal} api={API} water={w} addW={addW} subW={subW} meals={todayM} logMeal={logMeal} />}
        {tab === 'coach' && <ChatCoach ctx={ctx} calEv={calEv} initMsg={msg} clearMsg={() => setMsg(null)} profile={profile} api={API} dark={dark} water={w} meals={todayM} />}
        {tab === 'profile' && <MyProfile profile={profile} setProfile={setProfile} onTravel={(e) => setProfile(p => ({ ...p, travelLog: [...(p.travelLog || []).slice(-20), { ...e, date: today() }] }))} api={API} dark={dark} setDark={setDark} allMeals={meals} allWater={water} />}
      </main>

      <nav className={`flex sticky bottom-0 z-20 backdrop-blur-xl border-t ${dark ? 'bg-neutral-950/80 border-neutral-800' : 'bg-white/80 border-neutral-200'}`}>
        {tabs.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors ${tab === id ? 'text-emerald-600' : dark ? 'text-neutral-500' : 'text-neutral-400'}`}>
            <Icon size={19} strokeWidth={tab === id ? 2.2 : 1.5} />
            <span className={`text-[10px] ${tab === id ? 'font-semibold' : 'font-medium'}`}>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
