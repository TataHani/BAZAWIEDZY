'use client'
import { useState, useRef, useEffect } from 'react'
import { Send, BookOpen, Loader2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const question = input.trim()
    if (!question || loading) return

    const userMessage: Message = { role: 'user', content: question }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      })
      const data = await res.json()

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer || data.error || 'Błąd odpowiedzi',
        sources: data.sources || []
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Błąd połączenia z bazą wiedzy.'
      }])
    }

    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900">Baza Wiedzy Plichta</h1>
            <p className="text-xs text-slate-500">Zadaj pytanie o produkt</p>
          </div>
        </div>
        <a href="/admin" className="text-xs text-slate-400 hover:text-slate-600">
          Panel admina
        </a>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center mt-20">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen size={28} className="text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-700 mb-2">Czym mogę Ci pomóc?</h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              Zadaj pytanie dotyczące specyfikacji, wyposażenia lub cenników samochodów z naszej oferty.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                'Jaki jest zasięg elektryka?',
                'Jakie modele mają hak holowniczy?',
                'Jakie auta są dostępne z automatyczną skrzynią?',
              ].map(example => (
                <button
                  key={example}
                  onClick={() => setInput(example)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-2xl">
              <div className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {msg.sources.map(source => (
                    <span key={source} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                      📄 {source}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2">
              <Loader2 size={16} className="text-blue-500 animate-spin" />
              <span className="text-sm text-slate-500">Szukam w bazie wiedzy...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Zadaj pytanie produktowe..."
            rows={1}
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">
          Odpowiedzi generowane wyłącznie na podstawie dokumentów w bazie wiedzy
        </p>
      </div>
    </div>
  )
}
