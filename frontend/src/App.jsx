import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import ChatCoach from './components/ChatCoach'
import MyProfile from './components/MyProfile'
import Onboarding from './components/Onboarding'
import Logo from './components/Logo'
import { Home, MessageCircle, User } from 'lucide-react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL ?? ''
const STORAGE_KEY = 'fieldfit_profile'
const HYDRATION_KEY = 'fieldfit_hydration'
const MEALS_KEY = 'fieldfit_meals'
const THEME_KEY = 'fieldfit_theme'

const DEFAULT_PROFILE = {
  name: '',
  dietaryRestrictions: [],
  healthGoals: [],
  travelFrequency: '',
  sleepPattern: '',
  caffeineHabit: '',
  sensitivities: '',
  homeBase: '',
  onboarded: false,
  weeklyCheckins: [],
  travelLog: [],
  snackKit: [],
}

const tabs = [
  { id: 'dashboard', label: 'Home', Icon: Home },
  { id: 'coach', label: 'Coach', Icon: MessageCircle },
  { id: 'me', label: 'Profile', Icon: User },
]

function getTodayKey() {
  return new Date().toISOString().split('T')[0]
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [context, setContext] = useState({ location: '', energyLevel: 'normal' })
  const [initialMessage, setInitialMessage] = useState(null)
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [calendarEvents, setCalendarEvents] = useState(null)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(THEME_KEY) === 'dark')

  // Hydration: { date: count }
  const [hydration, setHydration] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HYDRATION_KEY)) || {} } catch { return {} }
  })

  // Meals: [{ date, time, text }]
  const [meals, setMeals] = useState(() => {
    try { return JSON.parse(localStorage.getItem(MEALS_KEY)) || [] } catch { return [] }
  })

  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? { ...DEFAULT_PROFILE, ...JSON.parse(saved) } : DEFAULT_PROFILE
    } catch { return DEFAULT_PROFILE }
  })

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)) }, [profile])
  useEffect(() => { localStorage.setItem(HYDRATION_KEY, JSON.stringify(hydration)) }, [hydration])
  useEffect(() => { localStorage.setItem(MEALS_KEY, JSON.stringify(meals)) }, [meals])
  useEffect(() => {
    localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  // Calendar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('calendar') === 'connected') {
      window.history.replaceState({}, '', '/')
      fetchCalendarEvents()
    } else { checkCalendarStatus() }
  }, [])

  const checkCalendarStatus = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/calendar/status`)
      if (data.connected) { setCalendarConnected(true); fetchCalendarEvents() }
    } catch {}
  }

  const fetchCalendarEvents = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/calendar/events`)
      setCalendarConnected(true); setCalendarEvents(data.events)
    } catch { setCalendarConnected(false); setCalendarEvents(null) }
  }

  const handleScenario = (message) => { setInitialMessage(message); setActiveTab('coach') }
  const handleOnboardingComplete = (data) => { setProfile((prev) => ({ ...prev, ...data, onboarded: true })) }

  const handleCheckin = (checkin) => {
    const dated = { ...checkin, date: getTodayKey() }
    setProfile((prev) => ({ ...prev, weeklyCheckins: [...(prev.weeklyCheckins || []).slice(-30), dated] }))
  }

  const handleTravelEntry = (entry) => {
    const dated = { ...entry, date: getTodayKey() }
    setProfile((prev) => ({ ...prev, travelLog: [...(prev.travelLog || []).slice(-20), dated] }))
  }

  const todayWater = hydration[getTodayKey()] || 0
  const addWater = () => setHydration((prev) => ({ ...prev, [getTodayKey()]: (prev[getTodayKey()] || 0) + 1 }))
  const removeWater = () => setHydration((prev) => ({ ...prev, [getTodayKey()]: Math.max(0, (prev[getTodayKey()] || 0) - 1) }))

  const todayMeals = meals.filter((m) => m.date === getTodayKey())
  const addMeal = (text) => setMeals((prev) => [...prev.slice(-50), { date: getTodayKey(), time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), text }])

  if (!profile.onboarded) return <Onboarding onComplete={handleOnboardingComplete} />

  const bg = darkMode ? 'bg-warm-900' : 'bg-cream'
  const headerBg = darkMode ? 'bg-warm-900/90' : 'bg-cream/90'
  const navBg = darkMode ? 'bg-warm-800/80 border-warm-700' : 'bg-white/80 border-warm-200'

  return (
    <div className={`min-h-screen ${bg} flex flex-col max-w-2xl mx-auto relative transition-colors duration-300`}>
      <header className={`px-6 pt-5 pb-4 flex items-center justify-between sticky top-0 ${headerBg} backdrop-blur-md z-10`}>
        <div className="flex items-center gap-3">
          <Logo size={36} className="rounded-xl shadow-sm" />
          <span className={`font-display text-lg font-bold ${darkMode ? 'text-warm-100' : 'text-warm-900'}`}>FieldFit</span>
        </div>
        <p className={`text-xs font-medium ${darkMode ? 'text-warm-500' : 'text-warm-400'}`}>
          {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
        </p>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
          <Dashboard context={context} setContext={setContext} onScenario={handleScenario}
            profile={profile} onCheckin={handleCheckin} darkMode={darkMode}
            calendarConnected={calendarConnected} calendarEvents={calendarEvents}
            onCalendarRefresh={fetchCalendarEvents} apiBase={API_BASE}
            todayWater={todayWater} addWater={addWater} removeWater={removeWater}
            todayMeals={todayMeals} addMeal={addMeal} />
        </div>
        <div className={activeTab === 'coach' ? 'block h-[calc(100vh-130px)]' : 'hidden'}>
          <ChatCoach context={context} calendarEvents={calendarEvents}
            initialMessage={initialMessage} onInitialMessageSent={() => setInitialMessage(null)}
            profile={profile} apiBase={API_BASE} darkMode={darkMode}
            todayWater={todayWater} todayMeals={todayMeals} />
        </div>
        <div className={activeTab === 'me' ? 'block' : 'hidden'}>
          <MyProfile profile={profile} setProfile={setProfile} onTravelEntry={handleTravelEntry}
            apiBase={API_BASE} darkMode={darkMode} setDarkMode={setDarkMode}
            meals={meals} hydration={hydration} />
        </div>
      </main>

      <nav className={`${navBg} backdrop-blur-md border-t flex sticky bottom-0 z-10 px-2`}>
        {tabs.map(({ id, label, Icon }) => {
          const active = activeTab === id
          return (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 py-3.5 flex flex-col items-center gap-1 transition-all duration-200 ${
                active ? 'text-sage-700' : darkMode ? 'text-warm-500 hover:text-warm-300' : 'text-warm-400 hover:text-warm-600'
              }`}>
              <Icon size={20} strokeWidth={active ? 2.2 : 1.5} />
              <span className={`text-[10px] ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
