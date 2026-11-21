import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, X, Send, Bot, Loader2, MapPin, ArrowUpRight } from 'lucide-react'
import API from '../api'
import { doctorCategories, symptomToCategory } from '../constants/locationData'

const getDoctorSearchRequest = (message) => {
  const normalizedMessage = ` ${message.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `
  const symptoms = Object.keys(symptomToCategory).sort((first, second) => second.length - first.length)
  const matchedSymptom = symptoms.find((symptom) => normalizedMessage.includes(` ${symptom} `))

  if (matchedSymptom) {
    return { category: symptomToCategory[matchedSymptom], symptom: matchedSymptom }
  }

  const matchedCategory = doctorCategories.find((category) =>
    normalizedMessage.includes(` ${category.toLowerCase()} `)
  )

  return matchedCategory ? { category: matchedCategory } : null
}

const getDoctorSearchTerm = (category) => category === 'Cardiologist' ? 'cardio' : category

export default function AIHealthChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am your HealPath Assistant. How can I help you today?' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  // Scroll to the bottom of the message container
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = { role: 'user', content: input.trim() }
    const updatedMessages = [...messages, userMessage]
    
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      const doctorSearchRequest = getDoctorSearchRequest(userMessage.content)
      if (doctorSearchRequest) {
        const response = await API.get('/doctors', {
          params: { search: getDoctorSearchTerm(doctorSearchRequest.category), limit: 5 }
        })
        const doctors = response.data.slice(0, 5)
        const categoryLabel = doctorSearchRequest.category.toLowerCase()
        const responseText = doctors.length
          ? doctorSearchRequest.symptom
            ? `For ${doctorSearchRequest.symptom}, here are approved ${categoryLabel}s listed on HealPath:`
            : `Here are approved ${categoryLabel}s listed on HealPath:`
          : `I couldn't find any approved ${categoryLabel}s listed on HealPath right now. You can browse the doctor directory for other options.`

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: responseText,
          doctors,
          urgentNote: doctorSearchRequest.symptom === 'chest pain' && doctors.length > 0
        }])
        return
      }

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ''

      // If no API key is provided, use a high-quality simulated response aligned with system instructions
      if (!apiKey) {
        await new Promise(resolve => setTimeout(resolve, 1200))
        
        let responseText = ""
        const lowerInput = userMessage.content.toLowerCase()
        
        if (lowerInput.includes('knee')) {
          responseText = "On HealPath, you can use the doctor search to look for orthopedic or physiotherapy specialists and then message your assigned doctor directly about knee symptoms. If you are unsure which doctor to contact, check your assigned doctor list in the Messages section."
        } else if (lowerInput.includes('shoulder')) {
          responseText = "For shoulder concerns on HealPath, the best step is to message your assigned doctor and describe your symptoms. If you need to change doctors, use the doctor search page to find specialists by symptoms and request a new assignment."
        } else if (lowerInput.includes('back')) {
          responseText = "If you have back-related questions, use HealPath's chat to contact your assigned doctor or book a consultation with a doctor who handles recovery and rehabilitation. I can also help you navigate the site features to do that."
        } else if (lowerInput.includes('pain') || lowerInput.includes('hurt')) {
          responseText = "On HealPath, you should share your symptoms with your assigned doctor and avoid relying on general tips. Use the Messages page to send your doctor a detailed update and ask if a video consultation is needed. I'm here to help with HealPath navigation, not as a substitute for medical advice."
        } else if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
          responseText = "Hi! I am your HealPath Assistant. I can help you use the website: find or message doctors, understand appointment and call workflows, and update your account. Ask me about HealPath features or where to go next."
        } else if (lowerInput.includes('search') || lowerInput.includes('doctor') || lowerInput.includes('symptom')) {
          responseText = "You can search for doctors on HealPath using symptoms. Go to the doctor search page, enter relevant symptoms, and review available specialists. Then message only your assigned doctor to discuss next steps."
        } else {
          responseText = "I am here to help with HealPath website questions only. Ask me how to message your assigned doctor, start a video call, find doctors by symptoms, or manage your profile. For medical questions, please consult a qualified healthcare professional through HealPath or another trusted channel."
        }
        
        setMessages(prev => [...prev, { role: 'assistant', content: responseText }])
        return
      }

      // Filter out the initial greeting if it starts with assistant role
      const apiMessages = updatedMessages
        .filter((msg, idx) => !(idx === 0 && msg.role === 'assistant'))
        .map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }))

      const payload = {
        contents: apiMessages,
        systemInstruction: {
          parts: [{
            text: 'You are HealPath Assistant, a friendly assistant for the HealPath website. Help users answer questions about HealPath features, including finding doctors by symptoms, messaging assigned doctors, managing appointments, and starting video consultations. Do not provide generic medical advice; instead, direct users to use HealPath to contact a qualified doctor or ask for more site-specific guidance. Be concise.'
          }]
        },
        generationConfig: {
          maxOutputTokens: 500
        }
      }

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': import.meta.env.VITE_GEMINI_API_KEY
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData?.error?.message || `API error: ${response.status}`)
      }

      const data = await response.json()
      const assistantText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'I received an empty response. How else can I help?'
      
      setMessages(prev => [...prev, { role: 'assistant', content: assistantText }])
    } catch (err) {
      console.error('HealPath Assistant API error:', err)
      // If the real API call fails, fall back to simulated responses so the UI remains operational
      await new Promise(resolve => setTimeout(resolve, 800))
      
      let fallbackText = "I'm having trouble connecting to my external intelligence network, but as your local HealPath Assistant I can still help with HealPath-specific navigation. Ask me how to message your assigned doctor, start a video call, search doctors by symptoms, or manage your account. For medical questions, please consult a qualified physician through HealPath."
      const lowerInput = userMessage.content.toLowerCase()
      if (lowerInput.includes('knee')) {
        fallbackText = "If you have knee questions, use HealPath's doctor search or message your assigned doctor directly. I can help you navigate to the right page."
      } else if (lowerInput.includes('shoulder')) {
        fallbackText = "For shoulder-related issues, send a message to your assigned doctor through HealPath, or use the symptom search page to find a relevant specialist."
      } else if (lowerInput.includes('back')) {
        fallbackText = "For back symptoms, ask your assigned doctor through the Messages page or search HealPath for a recovery specialist. I'm here to help with site navigation."
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: fallbackText }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Chat Widget Panel */}
      <div 
        className={`
          fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[520px] max-h-[calc(100vh-12rem)] 
          bg-white rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden 
          transition-all duration-300 origin-bottom-right
          ${isOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-75 opacity-0 pointer-events-none'}
        `}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-500 p-5 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Bot size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-black text-base leading-none">HealPath Assistant</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] font-bold text-teal-50 uppercase tracking-wider">Online</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/10 p-2 rounded-xl transition text-white/95 hover:text-white"
            aria-label="Close Assistant"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 custom-scrollbar">
          {messages.map((msg, idx) => {
            const isAssistant = msg.role === 'assistant'
            return (
              <div 
                key={idx} 
                className={`flex w-full ${isAssistant ? 'justify-start' : 'justify-end'}`}
              >
                <div 
                  className={`
                    max-w-[80%] px-4 py-2.5 text-sm shadow-sm
                    ${isAssistant 
                      ? 'bg-white text-slate-800 rounded-2xl rounded-tl-none border border-slate-150 leading-relaxed' 
                      : 'bg-teal-600 text-white rounded-2xl rounded-tr-none font-medium'
                    }
                  `}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                  {msg.urgentNote && (
                    <p className="mt-2 text-xs font-medium text-red-700">
                      Severe or sudden chest pain, especially with shortness of breath, may need emergency care.
                    </p>
                  )}
                  {msg.doctors?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {msg.doctors.map((doctor) => (
                        <Link
                          key={doctor._id}
                          to={`/doctor/${doctor._id}`}
                          className="block rounded-xl border border-slate-200 bg-slate-50 p-3 hover:border-teal-300 hover:bg-teal-50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-slate-900">{doctor.name || 'Doctor'}</span>
                            <ArrowUpRight size={15} className="shrink-0 text-teal-700" aria-hidden="true" />
                          </div>
                          <span className="mt-1 block text-xs font-medium text-teal-700">{doctor.category}</span>
                          {(doctor.city || doctor.province) && (
                            <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                              <MapPin size={12} aria-hidden="true" />
                              {[doctor.city, doctor.province].filter(Boolean).join(', ')}
                            </span>
                          )}
                          <span className="mt-2 inline-block text-xs font-semibold text-teal-700">View profile</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex w-full justify-start">
              <div className="bg-white text-slate-400 rounded-2xl rounded-tl-none border border-slate-150 px-4 py-3 shadow-sm flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 shrink-0">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Ask a health question..."
              className="flex-1 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 bg-slate-50 transition-all placeholder-slate-400 disabled:opacity-70"
            />
            <button 
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl p-2.5 transition active:scale-95 flex items-center justify-center shadow-md shadow-teal-100 disabled:opacity-50 disabled:scale-100 shrink-0"
              aria-label="Send message"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 font-medium text-center mt-2.5 select-none">
            Not a substitute for medical advice.
          </p>
        </form>
      </div>

      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="
          bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-full p-4.5 
          shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200
          flex items-center justify-center relative group
        "
        aria-label="Toggle HealPath Assistant"
      >
        {isOpen ? (
          <X size={26} className="transition-transform duration-200 rotate-0" />
        ) : (
          <>
            <MessageCircle size={26} className="transition-transform duration-200 hover:rotate-12" />
            <span className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4.5 w-4.5 bg-teal-500 border-2 border-white"></span>
            </span>
          </>
        )}
      </button>
    </div>
  )
}
