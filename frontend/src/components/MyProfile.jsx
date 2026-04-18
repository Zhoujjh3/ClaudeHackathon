import { useState } from 'react'
import {
  User, Target, Plane, Coffee, AlertTriangle,
  Plus, ChevronDown, ChevronUp, Loader2, Globe,
  Calendar, Sparkles, RotateCcw,
} from 'lucide-react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-green-300 font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-gray-300">$1</em>')
    .replace(/^### (.+)$/gm, '<p class="text-xs font-bold text-green-400 uppercase tracking-wider mt-3 mb-1">$1</p>')
    .replace(/^## (.+)$/gm, '<p class="text-sm font-bold text-white mt-3 mb-1">$1</p>')
    .replace(/^- (.+)$/gm, '<div class="flex gap-2 py-0.5"><span class="text-green-400 mt-0.5 flex-shrink-0">•</span><span>$1</span></div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-2 py-0.5"><span class="text-green-400 font-bold flex-shrink-0">$1.</span><span>$2</span></div>')
    .replace(/\n\n+/g, '<br />')
    .replace(/\n/g, '<br />')
}

function ProfileSection({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-[#121212] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon size={15} className="text-green-400" />
          <span className="text-sm font-semibold text-gray-200">{title}</span>
        </div>
        {open ? (
          <ChevronUp size={14} className="text-gray-600" />
        ) : (
          <ChevronDown size={14} className="text-gray-600" />
        )}
      </button>
      {open && <div className="px-4 pb-4 border-t border-[#1a1a1a] pt-3">{children}</div>}
    </div>
  )
}

export default function MyProfile({ profile, setProfile, onTravelEntry }) {
  const [travelCity, setTravelCity] = useState('')
  const [travelTimezone, setTravelTimezone] = useState('')
  const [briefing, setBriefing] = useState(null)
  const [briefingLoading, setBriefingLoading] = useState(false)

  const toggleDietary = (opt) => {
    setProfile((prev) => {
      const arr = prev.dietaryRestrictions || []
      if (opt === 'No restrictions') {
        return { ...prev, dietaryRestrictions: arr.includes(opt) ? [] : [opt] }
      }
      const filtered = arr.filter((v) => v !== 'No restrictions')
      return {
        ...prev,
        dietaryRestrictions: filtered.includes(opt)
          ? filtered.filter((v) => v !== opt)
          : [...filtered, opt],
      }
    })
  }

  const toggleGoal = (opt) => {
    setProfile((prev) => {
      const arr = prev.healthGoals || []
      return {
        ...prev,
        healthGoals: arr.includes(opt)
          ? arr.filter((v) => v !== opt)
          : [...arr, opt],
      }
    })
  }

  const addTravelEntry = () => {
    if (!travelCity.trim()) return
    onTravelEntry({ city: travelCity, timezone: travelTimezone || 'unknown' })
    setTravelCity('')
    setTravelTimezone('')
  }

  const generateBriefing = async () => {
    setBriefingLoading(true)
    try {
      const resp = await axios.post(`${API_URL}/api/weekly-briefing`, { profile })
      setBriefing(resp.data.briefing)
    } catch {
      setBriefing("Couldn't generate briefing right now — check your backend connection.")
    } finally {
      setBriefingLoading(false)
    }
  }

  const checkins = profile?.weeklyCheckins || []
  const travelLog = profile?.travelLog || []
  const recentCheckins = checkins.slice(-7).reverse()

  return (
    <div className="overflow-y-auto h-[calc(100vh-112px)] px-4 py-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">
            {profile.name ? `${profile.name}'s Profile` : 'My Profile'}
          </h1>
          <p className="text-gray-500 text-xs mt-0.5">
            Everything FieldFit knows about you
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
          <span className="text-green-400 font-bold text-sm">
            {profile.name ? profile.name[0].toUpperCase() : '?'}
          </span>
        </div>
      </div>

      {/* Weekly Briefing */}
      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-green-400" />
            <p className="text-xs font-semibold text-green-400 uppercase tracking-widest">
              Weekly Briefing
            </p>
          </div>
          <button
            onClick={generateBriefing}
            disabled={briefingLoading}
            className="text-xs text-green-500 hover:text-green-400 transition-colors flex items-center gap-1"
          >
            {briefingLoading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RotateCcw size={12} />
            )}
            {briefing ? 'Refresh' : 'Generate'}
          </button>
        </div>
        {briefing ? (
          <div
            className="text-sm text-gray-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(briefing) }}
          />
        ) : (
          <p className="text-xs text-gray-600">
            {checkins.length > 2
              ? 'Tap Generate for a personalized health summary based on your check-ins and travel.'
              : 'Complete a few daily check-ins first — then I can generate a personalized weekly briefing.'}
          </p>
        )}
      </div>

      {/* Travel Log */}
      <ProfileSection title="Travel Log" icon={Globe} defaultOpen={true}>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={travelCity}
              onChange={(e) => setTravelCity(e.target.value)}
              placeholder="City (e.g. Chicago)"
              className="flex-1 bg-[#181818] border border-[#242424] rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-gray-700 focus:border-green-900/60"
            />
            <input
              type="text"
              value={travelTimezone}
              onChange={(e) => setTravelTimezone(e.target.value)}
              placeholder="TZ (e.g. CST)"
              className="w-24 bg-[#181818] border border-[#242424] rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-gray-700 focus:border-green-900/60"
            />
            <button
              onClick={addTravelEntry}
              disabled={!travelCity.trim()}
              className="p-2 bg-green-500 hover:bg-green-400 disabled:bg-[#1a1a1a] disabled:text-gray-700 text-black rounded-lg transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          {travelLog.length > 0 ? (
            <div className="space-y-1.5">
              {[...travelLog].reverse().slice(0, 10).map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 text-xs py-1.5 border-b border-[#1a1a1a] last:border-0"
                >
                  <Plane size={11} className="text-blue-400 flex-shrink-0" />
                  <span className="text-gray-400">{entry.date}</span>
                  <span className="text-white font-medium">{entry.city}</span>
                  <span className="text-gray-600 ml-auto">{entry.timezone}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-700">
              Log your travels so I can factor in timezone shifts and jet lag.
            </p>
          )}
        </div>
      </ProfileSection>

      {/* Recent Check-ins */}
      {recentCheckins.length > 0 && (
        <ProfileSection title="Recent Check-ins" icon={Calendar}>
          <div className="space-y-2">
            {recentCheckins.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-xs py-2 border-b border-[#1a1a1a] last:border-0"
              >
                <span className="text-gray-600 w-16 flex-shrink-0">{c.date?.slice(5)}</span>
                <div className="flex gap-2 flex-wrap">
                  {c.energy && (
                    <span className="bg-[#181818] px-2 py-0.5 rounded text-gray-400">
                      ⚡ {c.energy}/5
                    </span>
                  )}
                  {c.sleepHours && (
                    <span className="bg-[#181818] px-2 py-0.5 rounded text-gray-400">
                      😴 {c.sleepHours}
                    </span>
                  )}
                  {c.mealQuality && (
                    <span className="bg-[#181818] px-2 py-0.5 rounded text-gray-400">
                      🍽️ {c.mealQuality}
                    </span>
                  )}
                  {c.hydration && (
                    <span className="bg-[#181818] px-2 py-0.5 rounded text-gray-400">
                      💧 {c.hydration}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ProfileSection>
      )}

      {/* Basic Info */}
      <ProfileSection title="Basic Info" icon={User}>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-widest block mb-1">Name</label>
            <input
              type="text"
              value={profile.name || ''}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              className="w-full bg-[#181818] border border-[#242424] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green-900/60"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-widest block mb-1">Home timezone</label>
            <input
              type="text"
              value={profile.homeBase || ''}
              onChange={(e) => setProfile((p) => ({ ...p, homeBase: e.target.value }))}
              placeholder="e.g. Eastern, Pacific..."
              className="w-full bg-[#181818] border border-[#242424] rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-gray-700 focus:border-green-900/60"
            />
          </div>
        </div>
      </ProfileSection>

      {/* Dietary */}
      <ProfileSection title="Dietary Needs" icon={AlertTriangle}>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {DIETARY_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => toggleDietary(opt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  (profile.dietaryRestrictions || []).includes(opt)
                    ? 'bg-green-500 text-black'
                    : 'bg-[#181818] text-gray-600 border border-[#242424] hover:border-[#333]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-widest block mb-1">
              Allergies / sensitivities
            </label>
            <input
              type="text"
              value={profile.sensitivities || ''}
              onChange={(e) => setProfile((p) => ({ ...p, sensitivities: e.target.value }))}
              placeholder="e.g. lactose intolerant, shellfish..."
              className="w-full bg-[#181818] border border-[#242424] rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-gray-700 focus:border-green-900/60"
            />
          </div>
        </div>
      </ProfileSection>

      {/* Goals */}
      <ProfileSection title="Health Goals" icon={Target}>
        <div className="flex flex-wrap gap-1.5">
          {GOAL_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => toggleGoal(opt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                (profile.healthGoals || []).includes(opt)
                  ? 'bg-green-500 text-black'
                  : 'bg-[#181818] text-gray-600 border border-[#242424] hover:border-[#333]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </ProfileSection>

      {/* Lifestyle */}
      <ProfileSection title="Lifestyle" icon={Coffee}>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-widest block mb-1.5">
              Travel frequency
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'weekly', label: '3-5 days/wk' },
                { id: 'biweekly', label: '1-2 trips/wk' },
                { id: 'monthly', label: 'Few/month' },
                { id: 'occasional', label: 'Occasional' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setProfile((p) => ({ ...p, travelFrequency: opt.id }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    profile.travelFrequency === opt.id
                      ? 'bg-green-500 text-black'
                      : 'bg-[#181818] text-gray-600 border border-[#242424] hover:border-[#333]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-widest block mb-1.5">
              Sleep pattern
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'irregular', label: 'Irregular' },
                { id: 'late', label: 'Night owl' },
                { id: 'early', label: 'Early riser' },
                { id: 'split', label: 'Split sleep' },
                { id: 'normal', label: 'Regular' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setProfile((p) => ({ ...p, sleepPattern: opt.id }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    profile.sleepPattern === opt.id
                      ? 'bg-green-500 text-black'
                      : 'bg-[#181818] text-gray-600 border border-[#242424] hover:border-[#333]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-widest block mb-1.5">
              Caffeine
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'heavy', label: '4+ cups' },
                { id: 'moderate', label: '2-3 cups' },
                { id: 'light', label: '1 cup' },
                { id: 'none', label: 'None' },
                { id: 'energy-drinks', label: 'Energy drinks' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setProfile((p) => ({ ...p, caffeineHabit: opt.id }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    profile.caffeineHabit === opt.id
                      ? 'bg-green-500 text-black'
                      : 'bg-[#181818] text-gray-600 border border-[#242424] hover:border-[#333]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ProfileSection>

      {/* Reset */}
      <button
        onClick={() => {
          if (window.confirm('Reset your profile? This clears all data including check-ins and travel log.')) {
            localStorage.clear()
            window.location.reload()
          }
        }}
        className="w-full py-3 text-xs text-gray-700 hover:text-red-400 transition-colors"
      >
        Reset all data
      </button>

      <div className="h-4" />
    </div>
  )
}
