import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, ImagePlus, X, Loader2, MapPin, Zap, Calendar } from 'lucide-react'
import axios from 'axios'

const SUGGESTED_PROMPTS = [
  "What should I eat at a typical airport food court?",
  "I've been awake for 18 hours. What do I eat now?",
  "Best foods to order at any hotel restaurant?",
  "I have 5 minutes to grab something — what do I do?",
  "How do I handle eating across multiple time zones in one week?",
  "What snacks should I always keep in my bag on assignment?",
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

export default function ChatCoach({ context, calendarEvents, initialMessage, onInitialMessageSent, apiBase }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "I'm FieldFit Coach — built for journalists in the field. Tell me where you are, what's available to eat, or ask anything. I'll give you immediate, practical advice.\n\nNo meal prep. No nonsense. Just what to do right now.",
    },
  ])
  const [input, setInput] = useState('')
  const [pendingImage, setPendingImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = useCallback(
    async (text, imageData) => {
      if (!text && !imageData) return
      setShowSuggestions(false)
      setLoading(true)

      let userApiContent
      if (imageData) {
        userApiContent = [
          {
            type: 'image',
            source: { type: 'base64', media_type: imageData.type, data: imageData.preview.split(',')[1] },
          },
          { type: 'text', text: text || 'What do you think of this food?' },
        ]
      } else {
        userApiContent = text
      }

      const displayMsg = {
        role: 'user',
        content: text || 'What do you think of this food?',
        imagePreview: imageData?.preview,
      }
      setMessages((prev) => [...prev, displayMsg])

      // Build history — convert image messages to text placeholders for history
      const history = messages.map((m) => ({
        role: m.role,
        content: m.imagePreview ? `[User shared a food photo] ${m.content}` : m.content,
      }))
      history.push({ role: 'user', content: userApiContent })

      try {
        const resp = await axios.post(`${apiBase}/api/chat`, {
          messages: history,
          location: context.location || null,
          energy_level: context.energyLevel || null,
          calendar_events: calendarEvents ?? null,
        })
        setMessages((prev) => [...prev, { role: 'assistant', content: resp.data.response }])
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Connection issue — make sure the backend is running, then try again.',
          },
        ])
      } finally {
        setLoading(false)
      }
    },
    [messages, context, calendarEvents, apiBase]
  )

  useEffect(() => {
    if (initialMessage) {
      sendMessage(initialMessage, null)
      onInitialMessageSent?.()
    }
  }, [initialMessage]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = () => {
    const text = input.trim()
    const image = pendingImage
    setInput('')
    setPendingImage(null)
    sendMessage(text, image)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPendingImage({ file, preview: ev.target.result, type: file.type })
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const hasContext = context.location || (context.energyLevel && context.energyLevel !== 'normal') || calendarEvents

  return (
    <div className="flex flex-col h-full">
      {/* Context banner */}
      {hasContext && (
        <div className="px-4 py-2 bg-[#0a160a] border-b border-green-900/30 flex gap-3 text-xs text-green-500 flex-shrink-0 flex-wrap">
          {context.location && (
            <span className="flex items-center gap-1">
              <MapPin size={11} /> {context.location}
            </span>
          )}
          {context.energyLevel && context.energyLevel !== 'normal' && (
            <span className="flex items-center gap-1">
              <Zap size={11} /> {context.energyLevel}
            </span>
          )}
          {calendarEvents && calendarEvents.length > 0 && (
            <span className="flex items-center gap-1">
              <Calendar size={11} /> {calendarEvents.length} event{calendarEvents.length !== 1 ? 's' : ''} today
            </span>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2.5 animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-black text-[10px] font-black flex-shrink-0 mt-1 shadow-md shadow-green-900/40">
                FF
              </div>
            )}
            <div
              className={`max-w-[84%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-green-600 text-white rounded-tr-md'
                  : 'bg-[#111] border border-[#1e1e1e] text-gray-200 rounded-tl-md'
              }`}
            >
              {msg.imagePreview && (
                <img src={msg.imagePreview} alt="Food" className="rounded-xl mb-2.5 max-h-52 object-cover w-full" />
              )}
              {msg.role === 'assistant' ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              ) : (
                <span>{msg.content}</span>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5 justify-start animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-black text-[10px] font-black flex-shrink-0 mt-1">
              FF
            </div>
            <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-green-400" />
              <span className="text-xs text-gray-500">Thinking...</span>
            </div>
          </div>
        )}

        {showSuggestions && messages.length === 1 && (
          <div className="space-y-2 mt-1">
            {SUGGESTED_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => sendMessage(prompt, null)}
                className="w-full text-left text-sm bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl px-4 py-3 text-gray-500 hover:text-green-400 hover:border-green-900/50 hover:bg-[#111] transition-all animate-fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Pending image preview */}
      {pendingImage && (
        <div className="px-4 py-2 border-t border-[#1a1a1a] flex-shrink-0">
          <div className="relative inline-block">
            <img src={pendingImage.preview} alt="Pending" className="h-14 w-14 object-cover rounded-xl" />
            <button
              onClick={() => setPendingImage(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center transition-colors"
            >
              <X size={10} strokeWidth={3} />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-[#1a1a1a] bg-[#080808] flex-shrink-0">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-600 hover:text-green-400 transition-colors flex-shrink-0"
            title="Attach food photo"
          >
            <ImagePlus size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImageSelect}
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything, or send a food photo..."
            className="flex-1 bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-700 outline-none resize-none focus:border-green-900/60 transition-colors leading-relaxed"
            rows={1}
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSubmit}
            disabled={loading || (!input.trim() && !pendingImage)}
            className="p-2.5 bg-green-500 hover:bg-green-400 disabled:bg-[#1a1a1a] disabled:text-gray-700 text-black rounded-xl transition-colors flex-shrink-0 shadow-md shadow-green-900/30 disabled:shadow-none"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
