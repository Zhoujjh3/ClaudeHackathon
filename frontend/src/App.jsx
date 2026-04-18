import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import ChatCoach from './components/ChatCoach'
import SnapAnalyze from './components/SnapAnalyze'
import { LayoutDashboard, MessageSquare, Camera } from 'lucide-react'

const tabs = [
  { id: 'dashboard', label: 'Home', Icon: LayoutDashboard },
  { id: 'coach', label: 'Coach', Icon: MessageSquare },
  { id: 'snap', label: 'Snap', Icon: Camera },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [context, setContext] = useState({ location: '', energyLevel: 'normal' })
  const [initialMessage, setInitialMessage] = useState(null)
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  const handleScenario = (message) => {
    setInitialMessage(message)
    setActiveTab('coach')
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col max-w-2xl mx-auto relative">
      {/* Header */}
      <header className="border-b border-[#1a1a1a] px-5 py-3 flex items-center justify-between sticky top-0 bg-[#080808] z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center shadow-lg shadow-green-900/40">
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
          <Dashboard context={context} setContext={setContext} onScenario={handleScenario} />
        </div>
        <div className={activeTab === 'coach' ? 'block h-[calc(100vh-112px)]' : 'hidden'}>
          <ChatCoach
            context={context}
            initialMessage={initialMessage}
            onInitialMessageSent={() => setInitialMessage(null)}
          />
        </div>
        <div className={activeTab === 'snap' ? 'block' : 'hidden'}>
          <SnapAnalyze context={context} />
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="border-t border-[#1a1a1a] bg-[#080808] flex sticky bottom-0 z-10">
        {tabs.map(({ id, label, Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
                active ? 'text-green-400' : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
