import { useState, useRef } from 'react'
import { Camera, Loader2, RefreshCw, Utensils, BookOpen, Refrigerator, CircleDot } from 'lucide-react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const MODES = [
  {
    id: 'general',
    label: 'Food',
    Icon: Utensils,
    description: 'Rate any food or snack for energy & health value',
  },
  {
    id: 'menu',
    label: 'Menu',
    Icon: BookOpen,
    description: "Snap a restaurant menu — I'll circle your best options",
  },
  {
    id: 'fridge',
    label: 'Fridge',
    Icon: Refrigerator,
    description: "Show me what you've got — I'll build you a quick meal",
  },
  {
    id: 'plate',
    label: 'Plate',
    Icon: CircleDot,
    description: "Analyze what you're about to eat (or just ate)",
  },
]

function renderAnalysis(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-green-300 font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<p class="text-[10px] font-bold text-green-400 uppercase tracking-widest mt-4 mb-1.5">$1</p>')
    .replace(/^## (.+)$/gm, '<p class="text-sm font-bold text-white mt-3 mb-1">$1</p>')
    .replace(/^- (.+)$/gm, '<div class="flex gap-2 py-1"><span class="text-green-400 flex-shrink-0 mt-0.5">•</span><span>$1</span></div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-2 py-1"><span class="text-green-400 font-bold flex-shrink-0">$1.</span><span>$2</span></div>')
    .replace(/\n\n+/g, '<br />')
    .replace(/\n/g, '<br />')
}

export default function SnapAnalyze({ context }) {
  const [mode, setMode] = useState('general')
  const [image, setImage] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [extraContext, setExtraContext] = useState('')
  const fileInputRef = useRef(null)

  const selectedMode = MODES.find((m) => m.id === mode)

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImage({ file, preview: ev.target.result })
      setAnalysis(null)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleAnalyze = async () => {
    if (!image) return
    setLoading(true)

    try {
      const form = new FormData()
      form.append('file', image.file)
      form.append('mode', mode)
      form.append('location', context.location || '')
      form.append('context', extraContext)

      const resp = await axios.post(`${API_URL}/api/analyze`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setAnalysis(resp.data.analysis)
    } catch {
      setAnalysis('Unable to analyze — please check the backend connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setImage(null)
    setAnalysis(null)
    setExtraContext('')
  }

  return (
    <div className="overflow-y-auto h-[calc(100vh-112px)] px-4 py-5">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold">Snap & Know</h1>
          <p className="text-gray-500 text-sm mt-0.5">Photo analysis in seconds. Menu, fridge, or plate.</p>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-4 gap-2">
          {MODES.map(({ id, label, Icon }) => {
            const active = mode === id
            return (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`rounded-2xl p-3 flex flex-col items-center gap-1.5 transition-all ${
                  active
                    ? 'bg-green-500 text-black shadow-lg shadow-green-900/40'
                    : 'bg-[#0f0f0f] border border-[#1e1e1e] text-gray-500 hover:border-[#2a2a2a] hover:text-gray-300'
                }`}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 1.5} />
                <span className="text-[11px] font-semibold">{label}</span>
              </button>
            )
          })}
        </div>

        {/* Mode description */}
        <p className="text-xs text-gray-600 -mt-1">{selectedMode?.description}</p>

        {/* Upload area */}
        {!analysis ? (
          <>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl cursor-pointer transition-all overflow-hidden ${
                image
                  ? 'border-green-500/30 bg-[#0a150a]'
                  : 'border-[#252525] bg-[#0f0f0f] hover:border-green-900/50 hover:bg-[#111]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageSelect}
              />

              {image ? (
                <img
                  src={image.preview}
                  alt="To analyze"
                  className="w-full max-h-72 object-contain"
                />
              ) : (
                <div className="py-14 flex flex-col items-center gap-3 text-gray-700">
                  <div className="w-14 h-14 rounded-2xl bg-[#181818] flex items-center justify-center">
                    <Camera size={22} className="text-gray-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Tap to snap or upload</p>
                    <p className="text-xs mt-1 text-gray-700">Works with any food, menu, or fridge photo</p>
                  </div>
                </div>
              )}
            </div>

            {image && (
              <>
                <input
                  type="text"
                  placeholder="Add context (optional): 'post-workout', 'only option at this airport'..."
                  value={extraContext}
                  onChange={(e) => setExtraContext(e.target.value)}
                  className="w-full bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 outline-none focus:border-green-900/60 transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    onClick={reset}
                    className="px-4 py-3 bg-[#0f0f0f] border border-[#1e1e1e] text-gray-500 text-sm font-medium rounded-xl hover:border-[#2a2a2a] transition-all"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="flex-1 py-3 bg-green-500 hover:bg-green-400 disabled:bg-[#1a1a1a] text-black disabled:text-gray-700 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-green-900/30 disabled:shadow-none"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      'Analyze'
                    )}
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          /* Analysis result */
          <div className="animate-slide-up">
            {/* Image thumbnail */}
            <div className="flex gap-3 mb-4 items-start">
              <img src={image.preview} alt="Analyzed" className="w-16 h-16 object-cover rounded-xl flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">
                  {selectedMode?.label} Analysis
                </p>
                {context.location && (
                  <p className="text-xs text-gray-600 mt-0.5">at {context.location}</p>
                )}
              </div>
            </div>

            {/* Result card */}
            <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl p-4">
              <div
                className="text-sm text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderAnalysis(analysis) }}
              />
            </div>

            <button
              onClick={reset}
              className="w-full mt-3 py-3 border border-[#1e1e1e] rounded-xl text-sm text-gray-500 hover:border-green-900/40 hover:text-green-400 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={13} />
              Analyze another
            </button>
          </div>
        )}

        <div className="h-2" />
      </div>
    </div>
  )
}
