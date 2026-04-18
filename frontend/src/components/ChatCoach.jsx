import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, ImagePlus, X, Loader2, MapPin, Zap } from 'lucide-react'
import Logo from './Logo'
import axios from 'axios'

const PROMPTS = [
  "What should I eat at a typical airport food court?",
  "I've been awake for 18 hours — what do I eat now?",
  "Best foods to order at any hotel restaurant?",
  "I have 5 minutes to grab something — what do I do?",
  "How do I handle eating across time zones?",
  "What snacks should I always keep in my bag?",
  "I keep stress-eating on deadline nights. Help.",
  "Build me a convenience store survival kit under $15.",
]

function md(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<p class="text-[11px] font-semibold text-sage-600 uppercase tracking-wider mt-3 mb-1">$1</p>')
    .replace(/^## (.+)$/gm, '<p class="text-sm font-semibold mt-3 mb-1">$1</p>')
    .replace(/^- (.+)$/gm, '<div class="flex gap-2 py-0.5"><span class="text-sage-400 flex-shrink-0">·</span><span>$1</span></div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-2 py-0.5"><span class="text-sage-500 font-medium flex-shrink-0">$1.</span><span>$2</span></div>')
    .replace(/\n\n+/g, '<br />').replace(/\n/g, '<br />')
}

export default function ChatCoach({ context, calendarEvents, initialMessage, onInitialMessageSent, profile, apiBase, darkMode, todayWater, todayMeals }) {
  const name = profile?.name || 'there'
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `Hey ${name} — I'm your FieldFit coach. I know your dietary needs, goals, and schedule. Ask me anything about eating on the road, staying sharp, or managing energy.\n\nNo meal prep. No nonsense. Just what works right now.`,
  }])
  const [input, setInput] = useState('')
  const [img, setImg] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPrompts, setShowPrompts] = useState(true)
  const endRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const send = useCallback(async (text, imageData) => {
    if (!text && !imageData) return
    setShowPrompts(false); setLoading(true)
    const apiContent = imageData
      ? [{ type: 'image', source: { type: 'base64', media_type: imageData.type, data: imageData.preview.split(',')[1] } }, { type: 'text', text: text || 'What do you think of this food?' }]
      : text
    const display = { role: 'user', content: text || 'What do you think of this food?', imagePreview: imageData?.preview }
    setMessages((p) => [...p, display])
    const history = messages.map((m) => ({ role: m.role, content: m.imagePreview ? `[Photo shared] ${m.content}` : m.content }))
    history.push({ role: 'user', content: apiContent })
    try {
      const r = await axios.post(`${apiBase}/api/chat`, {
        messages: history, location: context.location || null, energy_level: context.energyLevel || null,
        calendar_events: calendarEvents ?? null,
        profile: { ...(profile || {}), todayHydration: todayWater || 0, todayMeals: (todayMeals || []).map((m) => `${m.time}: ${m.text}`).join(', ') || 'none logged' },
      })
      setMessages((p) => [...p, { role: 'assistant', content: r.data.response }])
    } catch { setMessages((p) => [...p, { role: 'assistant', content: 'Connection issue — make sure the backend is running.' }]) }
    finally { setLoading(false) }
  }, [messages, context, calendarEvents, profile, apiBase, todayWater, todayMeals])

  useEffect(() => { if (initialMessage) { send(initialMessage, null); onInitialMessageSent?.() } }, [initialMessage])

  const submit = () => { const t = input.trim(); const i = img; setInput(''); setImg(null); send(t, i) }

  const dk = darkMode
  const bg = dk ? 'bg-warm-900' : 'bg-warm-50'
  const msgBg = dk ? 'bg-warm-800 border-warm-700 text-warm-200' : 'bg-white border-warm-200 text-warm-700'
  const inputArea = dk ? 'bg-warm-800 border-warm-700' : 'bg-white border-warm-200'

  return (
    <div className={`flex flex-col h-full ${bg}`}>
      {(context.location || (context.energyLevel && context.energyLevel !== 'normal')) && (
        <div className={`px-5 py-1.5 border-b flex gap-3 text-[11px] flex-shrink-0 ${dk ? 'bg-warm-800 border-warm-700 text-warm-400' : 'bg-white border-warm-200 text-warm-500'}`}>
          {context.location && <span className="flex items-center gap-1"><MapPin size={10} className="text-sage-500" /> {context.location}</span>}
          {context.energyLevel && context.energyLevel !== 'normal' && <span className="flex items-center gap-1"><Zap size={10} className="text-terra-500" /> {context.energyLevel}</span>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 animate-slide-up ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && <Logo size={28} className="rounded-lg flex-shrink-0 mt-0.5" />}
            <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
              m.role === 'user' ? 'bg-sage-600 text-white rounded-tr-sm' : `border rounded-tl-sm ${msgBg}`
            }`}>
              {m.imagePreview && <img src={m.imagePreview} alt="" className="rounded-lg mb-2 max-h-48 object-cover w-full" />}
              {m.role === 'assistant' ? <div dangerouslySetInnerHTML={{ __html: md(m.content) }} /> : <span>{m.content}</span>}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5 animate-fade-in">
            <Logo size={28} className="rounded-lg flex-shrink-0" />
            <div className={`border rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-2 ${msgBg}`}>
              <Loader2 size={13} className="animate-spin text-sage-500" />
              <span className={`text-xs ${dk ? 'text-warm-500' : 'text-warm-400'}`}>Thinking...</span>
            </div>
          </div>
        )}
        {showPrompts && messages.length === 1 && (
          <div className="space-y-1.5 mt-2">
            {PROMPTS.map((p, i) => (
              <button key={i} onClick={() => send(p, null)}
                className={`w-full text-left text-[13px] border rounded-lg px-3.5 py-2.5 transition-all animate-fade-in ${dk ? 'bg-warm-800 border-warm-700 text-warm-400 hover:text-sage-300 hover:border-sage-700' : 'bg-white border-warm-200 text-warm-500 hover:text-sage-700 hover:border-sage-300'}`}
                style={{ animationDelay: `${i * 30}ms` }}>{p}</button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {img && (
        <div className={`px-5 py-2 border-t flex-shrink-0 ${inputArea}`}>
          <div className="relative inline-block">
            <img src={img.preview} alt="" className="h-12 w-12 object-cover rounded-lg" />
            <button onClick={() => setImg(null)} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"><X size={8} className="text-white" /></button>
          </div>
        </div>
      )}

      <div className={`px-5 py-3 border-t flex-shrink-0 ${inputArea}`}>
        <div className="flex items-end gap-2">
          <button onClick={() => fileRef.current?.click()} className={`p-1.5 transition-colors flex-shrink-0 ${dk ? 'text-warm-500 hover:text-sage-400' : 'text-warm-300 hover:text-sage-600'}`}>
            <ImagePlus size={18} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => setImg({ file: f, preview: ev.target.result, type: f.type }); r.readAsDataURL(f); e.target.value = '' }} />
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
            placeholder="Ask anything..."
            className={`flex-1 border rounded-lg px-3.5 py-2 text-[13px] outline-none resize-none focus:border-sage-400 transition-colors leading-relaxed ${dk ? 'bg-warm-700 border-warm-600 text-warm-100 placeholder-warm-500' : 'bg-warm-50 border-warm-200 text-warm-800 placeholder-warm-300'}`}
            rows={1} style={{ minHeight: '38px', maxHeight: '100px' }} />
          <button onClick={submit} disabled={loading || (!input.trim() && !img)}
            className="p-2 bg-sage-600 hover:bg-sage-700 disabled:opacity-30 text-white rounded-lg transition-all flex-shrink-0"><Send size={15} /></button>
        </div>
      </div>
    </div>
  )
}
