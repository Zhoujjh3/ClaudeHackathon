import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, ImagePlus, X, Loader2, MapPin, Zap } from 'lucide-react'
import Logo from './Logo'
import axios from 'axios'

const SUGGESTED_PROMPTS = [
  "What should I eat at a typical airport food court?",
  "I've been awake for 18 hours — what do I eat now?",
  "Best foods to order at any hotel restaurant?",
  "I have 5 minutes to grab something — what do I do?",
  "How do I handle eating across time zones?",
  "What snacks should I always keep in my bag?",
  "I keep stress-eating on deadline nights. Help.",
  "Build me a convenience store survival kit under $15.",
]

function renderMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-warm-900 font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-warm-600">$1</em>')
    .replace(/^### (.+)$/gm, '<p class="text-[11px] font-semibold text-sage-700 uppercase tracking-wider mt-4 mb-1">$1</p>')
    .replace(/^## (.+)$/gm, '<p class="text-sm font-bold text-warm-900 mt-3 mb-1">$1</p>')
    .replace(/^- (.+)$/gm, '<div class="flex gap-2 py-0.5"><span class="text-sage-500 mt-0.5 flex-shrink-0">•</span><span>$1</span></div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-2 py-0.5"><span class="text-sage-600 font-semibold flex-shrink-0">$1.</span><span>$2</span></div>')
    .replace(/\n\n+/g, '<br />')
    .replace(/\n/g, '<br />')
}

export default function ChatCoach({ context, calendarEvents, initialMessage, onInitialMessageSent, profile, apiBase }) {
  const name = profile?.name || 'there'
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: `Hey ${name} — I'm your FieldFit coach. I know your dietary needs, your goals, and your schedule. Ask me anything about eating on the road, staying sharp, or managing energy.\n\nNo meal prep. No nonsense. Just what works for you, right now.`,
  }])
  const [input, setInput] = useState('')
  const [pendingImage, setPendingImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const sendMessage = useCallback(async (text, imageData) => {
    if (!text && !imageData) return
    setShowSuggestions(false)
    setLoading(true)

    let userApiContent
    if (imageData) {
      userApiContent = [
        { type: 'image', source: { type: 'base64', media_type: imageData.type, data: imageData.preview.split(',')[1] } },
        { type: 'text', text: text || 'What do you think of this food?' },
      ]
    } else { userApiContent = text }

    const displayMsg = { role: 'user', content: text || 'What do you think of this food?', imagePreview: imageData?.preview }
    setMessages((prev) => [...prev, displayMsg])

    const history = messages.map((m) => ({ role: m.role, content: m.imagePreview ? `[User shared a food photo] ${m.content}` : m.content }))
    history.push({ role: 'user', content: userApiContent })

    try {
      const resp = await axios.post(`${apiBase}/api/chat`, {
        messages: history, location: context.location || null,
        energy_level: context.energyLevel || null, calendar_events: calendarEvents ?? null, profile: profile || null,
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: resp.data.response }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection issue — make sure the backend is running, then try again.' }])
    } finally { setLoading(false) }
  }, [messages, context, calendarEvents, profile, apiBase])

  useEffect(() => { if (initialMessage) { sendMessage(initialMessage, null); onInitialMessageSent?.() } }, [initialMessage])

  const handleSubmit = () => { const t = input.trim(); const img = pendingImage; setInput(''); setPendingImage(null); sendMessage(t, img) }
  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }
  const handleImageSelect = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPendingImage({ file, preview: ev.target.result, type: file.type })
    reader.readAsDataURL(file); e.target.value = ''
  }

  return (
    <div className="flex flex-col h-full bg-warm-50">
      {/* Context banner */}
      {(context.location || (context.energyLevel && context.energyLevel !== 'normal')) && (
        <div className="px-5 py-2 bg-white border-b border-warm-200 flex gap-3 text-xs text-warm-500 flex-shrink-0">
          {context.location && <span className="flex items-center gap-1"><MapPin size={11} className="text-sage-500" /> {context.location}</span>}
          {context.energyLevel && context.energyLevel !== 'normal' && <span className="flex items-center gap-1"><Zap size={11} className="text-terra-500" /> {context.energyLevel}</span>}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <Logo size={32} className="rounded-xl flex-shrink-0 mt-0.5 shadow-sm" />
            )}
            <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-sage-600 text-white rounded-tr-md shadow-md shadow-sage-600/15'
                : 'bg-white border border-warm-200 text-warm-700 rounded-tl-md shadow-sm'
            }`}>
              {msg.imagePreview && <img src={msg.imagePreview} alt="Food" className="rounded-xl mb-2.5 max-h-52 object-cover w-full" />}
              {msg.role === 'assistant'
                ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                : <span>{msg.content}</span>
              }
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start animate-fade-in">
            <Logo size={32} className="rounded-xl flex-shrink-0 shadow-sm" />
            <div className="bg-white border border-warm-200 rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-2 shadow-sm">
              <Loader2 size={14} className="animate-spin text-sage-500" />
              <span className="text-xs text-warm-400">Thinking...</span>
            </div>
          </div>
        )}

        {showSuggestions && messages.length === 1 && (
          <div className="space-y-2 mt-2">
            {SUGGESTED_PROMPTS.map((prompt, i) => (
              <button key={i} onClick={() => sendMessage(prompt, null)}
                className="w-full text-left text-sm bg-white border border-warm-200 rounded-xl px-4 py-3 text-warm-500 hover:text-sage-700 hover:border-sage-300 hover:bg-sage-50/50 transition-all animate-fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >{prompt}</button>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending image */}
      {pendingImage && (
        <div className="px-5 py-2 border-t border-warm-200 bg-white flex-shrink-0">
          <div className="relative inline-block">
            <img src={pendingImage.preview} alt="Pending" className="h-14 w-14 object-cover rounded-xl" />
            <button onClick={() => setPendingImage(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center transition-colors"
            ><X size={10} strokeWidth={3} className="text-white" /></button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-5 py-3 border-t border-warm-200 bg-white flex-shrink-0">
        <div className="flex items-end gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="p-2 text-warm-300 hover:text-sage-600 transition-colors flex-shrink-0" title="Attach food photo">
            <ImagePlus size={20} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className="flex-1 bg-warm-50 border border-warm-200 rounded-xl px-4 py-2.5 text-sm text-warm-800 placeholder-warm-300 outline-none resize-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100 transition-all leading-relaxed"
            rows={1} style={{ minHeight: '42px', maxHeight: '120px' }}
          />
          <button onClick={handleSubmit} disabled={loading || (!input.trim() && !pendingImage)}
            className="p-2.5 bg-sage-600 hover:bg-sage-700 disabled:bg-warm-200 disabled:text-warm-400 text-white rounded-xl transition-all flex-shrink-0 shadow-md shadow-sage-600/20 disabled:shadow-none"
          ><Send size={16} /></button>
        </div>
      </div>
    </div>
  )
}
