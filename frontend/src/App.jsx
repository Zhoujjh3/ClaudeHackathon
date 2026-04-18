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
}

const tabs = [
  { id: 'dashboard', label: 'Home', Icon: Home },
  { id: 'coach', label: 'Coach', Icon: MessageCircle },
  { id: 'me', label: 'Profile', Icon: User },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [context, setContext] = useState({ location: '', energyLevel: 'normal' })
  const [initialMessage, setInitialMessage] = useState(null)
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [calendarEvents, setCalendarEvents] = useState(null)

  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? { ...DEFAULT_PROFILE, ...JSON.parse(saved) } : DEFAULT_PROFILE
    } catch {
      return DEFAULT_PROFILE
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  }, [profile])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('calendar') === 'connected') {
      window.history.replaceState({}, '', '/')
      fetchCalendarEvents()
    } else {
      checkCalendarStatus()
    }
  }, [])

  const checkCalendarStatus = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/calendar/status`)
      if (data.connected) {
        setCalendarConnected(true)
        fetchCalendarEvents()
      }
    } catch {}
  }

  const fetchCalendarEvents = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/calendar/events`)
      setCalendarConnected(true)
      setCalendarEvents(data.events)
    } catch {
      setCalendarConnected(false)
      setCalendarEvents(null)
    }
  }

  const handleScenario = (message) => {
    setInitialMessage(message)
    setActiveTab('coach')
  }

  const handleOnboardingComplete = (data) => {
    setProfile((prev) => ({ ...prev, ...data, onboarded: true }))
  }

  const handleCheckin = (checkin) => {
    const dated = { ...checkin, date: new Date().toISOString().split('T')[0] }
    setProfile((prev) => ({
      ...prev,
      weeklyCheckins: [...(prev.weeklyCheckins || []).slice(-30), dated],
    }))
  }

  const handleTravelEntry = (entry) => {
    const dated = { ...entry, date: new Date().toISOString().split('T')[0] }
    setProfile((prev) => ({
      ...prev,
      travelLog: [...(prev.travelLog || []).slice(-20), dated],
    }))
  }

  if (!profile.onboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col max-w-2xl mx-auto relative">
      {/* Header */}
      <header className="px-6 pt-5 pb-4 flex items-center justify-between sticky top-0 bg-cream/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <Logo size={36} className="rounded-xl shadow-sm" />
          <div>
            <span className="font-display text-lg font-bold text-warm-900">FieldFit</span>
          </div>
        </div>
        <p className="text-xs text-warm-400 font-medium">
          {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
        </p>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <div className={activeTab === 'dashboard' ? 'block' : 'hidden'}>
          <Dashboard
            context={context}
            setContext={setContext}
            onScenario={handleScenario}
            profile={profile}
            onCheckin={handleCheckin}
            calendarConnected={calendarConnected}
            calendarEvents={calendarEvents}
            onCalendarRefresh={fetchCalendarEvents}
            apiBase={API_BASE}
          />
        </div>
        <div className={activeTab === 'coach' ? 'block h-[calc(100vh-130px)]' : 'hidden'}>
          <ChatCoach
            context={context}
            calendarEvents={calendarEvents}
            initialMessage={initialMessage}
            onInitialMessageSent={() => setInitialMessage(null)}
            profile={profile}
            apiBase={API_BASE}
          />
        </div>
        <div className={activeTab === 'me' ? 'block' : 'hidden'}>
          <MyProfile
            profile={profile}
            setProfile={setProfile}
            onTravelEntry={handleTravelEntry}
            apiBase={API_BASE}
          />
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="bg-white/80 backdrop-blur-md border-t border-warm-200 flex sticky bottom-0 z-10 px-2">
        {tabs.map(({ id, label, Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 py-3.5 flex flex-col items-center gap-1 transition-all duration-200 ${
                active ? 'text-sage-700' : 'text-warm-400 hover:text-warm-600'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.5} />
              <span className={`text-[10px] ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
