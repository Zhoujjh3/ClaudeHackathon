import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, ImagePlus, X, Loader2, MapPin, Zap } from 'lucide-react'
import Logo from './Logo'
import axios from 'axios'

const PROMPTS = [
  "What should I eat at a typical airport food court?",
  "Been awake 18 hours — what do I eat now?",
  "Best hotel restaurant orders?",
  "5 minutes to grab something — what do I do?",
  "Eating across time zones — how?",
  "What snacks should always be in my bag?",
  "Stress-eating on deadline nights. Help.",
  "Convenience store survival kit under $15.",
]

function md(t) {
  return t
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<p class="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mt-3 mb-0.5">$1</p>')
    .replace(/^## (.+)$/gm, '<p class="text-sm font-semibold mt-2.5 mb-0.5">$1</p>')
    .replace(/^- (.+)$/gm, '<div class="flex gap-1.5 py-0.5"><span class="text-emerald-400 flex-shrink-0">·</span><span>$1</span></div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-1.5 py-0.5"><span class="text-emerald-500 font-medium flex-shrink-0">$1.</span><span>$2</span></div>')
    .replace(/\n\n+/g, '<br/>').replace(/\n/g, '<br/>')
}

export default function ChatCoach({ ctx, calEv, initMsg, clearMsg, profile, api, dark, water, meals }) {
  const nm = profile?.name || 'there'
  const [msgs, setMsgs] = useState([{ role: 'assistant', content: `Hey ${nm} — I know your dietary needs, goals, and schedule. Ask me anything about eating on the road or managing energy. No meal prep, no nonsense.` }])
  const [input, setInput] = useState('')
  const [img, setImg] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showP, setShowP] = useState(true)
  const endRef = useRef(null), fileRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, loading])

  const send = useCallback(async (text, imgD) => {
    if (!text && !imgD) return; setShowP(false); setLoading(true)
    const apiC = imgD ? [{ type: 'image', source: { type: 'base64', media_type: imgD.type, data: imgD.preview.split(',')[1] } }, { type: 'text', text: text || 'What do you think of this?' }] : text
    setMsgs(p => [...p, { role: 'user', content: text || 'What do you think of this?', img: imgD?.preview }])
    const hist = msgs.map(m => ({ role: m.role, content: m.img ? `[Photo] ${m.content}` : m.content }))
    hist.push({ role: 'user', content: apiC })
    try {
      const r = await axios.post(`${api}/api/chat`, { messages: hist, location: ctx.location || null, energy_level: ctx.energyLevel || null, calendar_events: calEv ?? null, profile: { ...(profile || {}), todayHydration: water || 0, todayMeals: (meals || []).map(m => `${m.time}: ${m.text}`).join(', ') || 'none' } })
      setMsgs(p => [...p, { role: 'assistant', content: r.data.response }])
    } catch { setMsgs(p => [...p, { role: 'assistant', content: 'Connection issue — check the backend.' }]) }
    finally { setLoading(false) }
  }, [msgs, ctx, calEv, profile, api, water, meals])

  useEffect(() => { if (initMsg) { send(initMsg, null); clearMsg?.() } }, [initMsg])

  const sub = () => { const t = input.trim(), i = img; setInput(''); setImg(null); send(t, i) }
  const t1 = dark ? 'text-white' : 'text-neutral-900'
  const t3 = dark ? 'text-neutral-500' : 'text-neutral-400'

  return (
    <div className={`flex flex-col h-[calc(100vh-120px)] ${dark ? 'bg-neutral-950' : 'bg-neutral-50'}`}>
      {(ctx.location || (ctx.energyLevel && ctx.energyLevel !== 'normal')) && (
        <div className={`px-4 py-1.5 border-b flex gap-3 text-[10px] font-medium ${dark ? 'bg-neutral-900 border-neutral-800 text-neutral-500' : 'bg-white border-neutral-200 text-neutral-400'}`}>
          {ctx.location && <span className="flex items-center gap-1"><MapPin size={9} className="text-emerald-500" />{ctx.location}</span>}
          {ctx.energyLevel !== 'normal' && <span className="flex items-center gap-1"><Zap size={9} className="text-amber-500" />{ctx.energyLevel}</span>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-2 animate-slide-up ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'assistant' && <Logo size={26} className="rounded-lg flex-shrink-0 mt-0.5" />}
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
              m.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-sm' : `card-sm ${dark ? 'text-neutral-300' : 'text-neutral-700'}`
            }`}>
              {m.img && <img src={m.img} alt="" className="rounded-lg mb-2 max-h-44 object-cover w-full" />}
              {m.role === 'assistant' ? <div dangerouslySetInnerHTML={{ __html: md(m.content) }} /> : m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 animate-fade-in">
            <Logo size={26} className="rounded-lg flex-shrink-0" />
            <div className="card-sm px-3.5 py-2.5 flex items-center gap-2">
              <Loader2 size={12} className="animate-spin text-emerald-500" />
              <span className={`text-[11px] ${t3}`}>Thinking...</span>
            </div>
          </div>
        )}
        {showP && msgs.length === 1 && (
          <div className="space-y-1.5 mt-1">
            {PROMPTS.map((p, i) => (
              <button key={i} onClick={() => send(p)} className={`card-sm w-full text-left text-[12px] px-3.5 py-2.5 transition-all hover:shadow-sm ${dark ? 'text-neutral-400 hover:text-emerald-400' : 'text-neutral-500 hover:text-emerald-700'}`}
                style={{ animationDelay: `${i * 25}ms` }}>{p}</button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {img && (
        <div className={`px-4 py-2 border-t ${dark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
          <div className="relative inline-block">
            <img src={img.preview} alt="" className="h-11 w-11 object-cover rounded-lg" />
            <button onClick={() => setImg(null)} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"><X size={7} className="text-white" /></button>
          </div>
        </div>
      )}

      <div className={`px-4 py-2.5 border-t ${dark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
        <div className="flex items-end gap-2">
          <button onClick={() => fileRef.current?.click()} className={`p-1.5 ${dark ? 'text-neutral-500 hover:text-emerald-400' : 'text-neutral-300 hover:text-emerald-600'} transition-colors`}>
            <ImagePlus size={17} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setImg({ file: f, preview: ev.target.result, type: f.type }); r.readAsDataURL(f); e.target.value = '' }} />
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sub() } }}
            placeholder="Ask anything..."
            className="input flex-1 text-[13px] py-2 resize-none leading-relaxed" rows={1} style={{ minHeight: '36px', maxHeight: '96px' }} />
          <button onClick={sub} disabled={loading || (!input.trim() && !img)} className="btn-primary p-2 disabled:opacity-30"><Send size={14} /></button>
        </div>
      </div>
    </div>
  )
}
