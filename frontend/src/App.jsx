import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import ChatCoach from './components/ChatCoach'
import MyProfile from './components/MyProfile'
import Onboarding from './components/Onboarding'
import { LayoutDashboard, MessageSquare, User } from 'lucide-react'
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
  { id: 'dashboard', label: 'Home', Icon: LayoutDashboard },
  { id: 'coach', label: 'Coach', Icon: MessageSquare },
  { id: 'me', label: 'Me', Icon: User },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [context, setContext] = useState({ location: '', energyLevel: 'normal' })
  const [initialMessage, setInitialMessage] = useState(null)
  const [clock, setClock] = useState(new Date())
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

  // Persist profile to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  }, [profile])

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  // Calendar: check status + handle OAuth callback
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
    } catch {
      // Calendar not available — silent fail
    }
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

  // Show onboarding if not completed
  if (!profile.onboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col max-w-2xl mx-auto relative">
      {/* Header */}
      <header className="border-b border-[#1a1a1a] px-5 py-3 flex items-center justify-between sticky top-0 bg-[#080808]/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center shadow-lg shadow-green-900/40 animate-glow">
            <span className="text-black font-black text-xs tracking-tight">FF</span>
          </div>
          <div>
            <span className="font-bold text-base">FieldFit</span>
            <span className="text-[10px] text-gray-600 ml-1.5">by Claude</span>
          </div>
        </div>
        <div className="text-xs text-gray-500 bg-[#111] border border-[#1f1f1f] px-2.5 py-1 rounded-full tabular-nums">
          {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
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
        <div className={activeTab === 'coach' ? 'block h-[calc(100vh-112px)]' : 'hidden'}>
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
      <nav className="border-t border-[#1a1a1a] bg-[#080808]/95 backdrop-blur-sm flex sticky bottom-0 z-10">
        {tabs.map(({ id, label, Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 transition-all duration-200 ${
                active ? 'text-green-400' : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                {active && (
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-400" />
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
