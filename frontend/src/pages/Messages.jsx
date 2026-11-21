import { useState, useEffect, useRef } from 'react'
import DashboardShell from '../components/DashboardShell'
import JitsiCallModal from '../components/JitsiCallModal'
import API from '../api'
import toast from 'react-hot-toast'

export default function Messages() {
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [activeContact, setActiveContact] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [allUsers, setAllUsers] = useState([])
  const [showNewChat, setShowNewChat] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)

  // ─── Video Call State ───────────────────────────────────────────────────────
  const [activeCallRoom, setActiveCallRoom] = useState(null)
  const [activeCallUserName, setActiveCallUserName] = useState('')
  const [creatingCall, setCreatingCall] = useState(false)
  const [incomingCallInvite, setIncomingCallInvite] = useState(null)

  // Clear any incoming invite when active call ends to avoid stale prompts
  useEffect(() => {
    if (!activeCallRoom) {
      setIncomingCallInvite(null)
    }
  }, [activeCallRoom])

  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'))
  const prevMessageCountRef = useRef(0)
  const prevUnreadCountRef = useRef(0)
  const currentUserId = localStorage.getItem('userId')
  const role = localStorage.getItem('role')
  const pollingRef = useRef(null)
  const processedInviteRef = useRef(null)

  // ─── Message & Chat Polling (REST) ──────────────────────────────────────────
  useEffect(() => {
    fetchConversations()
    fetchUsers()

    // Poll for messages and conversation list updates every 2 seconds
    pollingRef.current = setInterval(() => {
      fetchConversations()
      if (activeContact) {
        pollMessages(activeContact._id)
      }
    }, 2000)

    return () => {
      clearInterval(pollingRef.current)
    }
  }, [activeContact])

  useEffect(() => {
    // Auto-scroll disabled: user controls scroll position manually.
  }, [messages])

  const getUnreadCount = (msgs) => {
    return msgs.filter(msg => msg.receiver?._id?.toString() === currentUserId && msg.read === false).length
  }

  const isVideoInviteMessage = (msg) => {
    return typeof msg?.content === 'string' && msg.content.startsWith('VIDEO_CALL_INVITE:')
  }

  const getInviteRoomName = (msg) => {
    return isVideoInviteMessage(msg) ? msg.content.replace('VIDEO_CALL_INVITE:', '') : ''
  }

  const isRecentInvite = (msg, minutes = 5) => {
    if (!msg?.date) return false
    const msgDate = new Date(msg.date)
    return Date.now() - msgDate.getTime() <= minutes * 60 * 1000
  }

  const markMessageAsRead = async (messageId) => {
    if (!messageId) return
    try {
      await API.patch(`/messages/${messageId}/read`)
    } catch (err) {
      console.error('Failed to mark message as read', err)
    }
  }

  const openIncomingInvite = (msg) => {
    const roomName = getInviteRoomName(msg)
    if (!roomName) return
    const senderName = msg.sender?.name || 'Someone'
    setIncomingCallInvite({ roomName, senderName, messageId: msg._id })
  }

  const handleAcceptInvite = async () => {
    if (!incomingCallInvite?.roomName) return
    await markMessageAsRead(incomingCallInvite.messageId)
    setActiveCallRoom(incomingCallInvite.roomName)
    setActiveCallUserName(localStorage.getItem('name') || 'Guest')
    setIncomingCallInvite(null)
  }

  const handleDeclineInvite = async () => {
    await markMessageAsRead(incomingCallInvite?.messageId)
    setIncomingCallInvite(null)
    toast('Call declined', { icon: '🙅' })
  }

  const pollMessages = async (contactId) => {
    try {
      const res = await API.get(`/messages/${contactId}`)
      const latestMessages = res.data
      const latestUnreadCount = getUnreadCount(latestMessages)
      const hasNewMessages = latestMessages.length > prevMessageCountRef.current

      if (hasNewMessages) {
        const lastMsg = latestMessages[latestMessages.length - 1]
        const isFromOtherPerson = lastMsg.sender._id?.toString() !== currentUserId

        if (isFromOtherPerson && latestUnreadCount > prevUnreadCountRef.current) {
          audioRef.current.play().catch(e => console.log('Sound blocked by browser'))
        }
      }


      prevMessageCountRef.current = latestMessages.length
      prevUnreadCountRef.current = latestUnreadCount
      setMessages(latestMessages)

      const latestInvite = [...latestMessages].reverse().find((msg) => {
        const isIncoming = (msg.sender?._id || msg.sender) !== currentUserId
        return isIncoming && !msg.read && isVideoInviteMessage(msg) && isRecentInvite(msg)
      })

      if (latestInvite) {
        const inviteKey = latestInvite._id || `${latestInvite.date}-${latestInvite.sender?._id}`
        if (inviteKey !== processedInviteRef.current) {
          processedInviteRef.current = inviteKey
          openIncomingInvite(latestInvite)
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchConversations = async () => {
    try {
      const res = await API.get('/messages/conversations')
      setConversations(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchUsers = async () => {
    try {
      const endpoint = role === 'doctor' ? '/messages/users/patients' : '/messages/users/doctors'
      const res = await API.get(endpoint)
      setAllUsers(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const openConversation = async (contact) => {
    setShowNewChat(false)
    try {
      const res = await API.get(`/messages/${contact._id}`)
      setActiveContact(contact)
      setMessages(res.data)
      prevMessageCountRef.current = res.data.length
      prevUnreadCountRef.current = getUnreadCount(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const sendMessage = async (e) => {
    e?.preventDefault()
    if ((!newMessage.trim() && !selectedFile) || !activeContact) return
    setSending(true)
    
    let fileData = null;
    let fileName = null;
    
    if (selectedFile) {
      fileName = selectedFile.name;
      fileData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });
    }

    try {
      const res = await API.post('/messages', { 
        receiver: activeContact._id, 
        content: newMessage,
        fileData,
        fileName
      })
      const updatedMessages = [...messages, res.data]
      setMessages(updatedMessages)
      prevMessageCountRef.current = updatedMessages.length
      prevUnreadCountRef.current = getUnreadCount(updatedMessages)
      setNewMessage('')
      setSelectedFile(null)
      fetchConversations()
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  const sanitizeJitsiRoomSegment = (value) => {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const getConversationRoomName = (contactId) => {
    if (!currentUserId || !contactId) return ''
    const ids = [String(currentUserId), String(contactId)]
      .map(sanitizeJitsiRoomSegment)
      .sort((a, b) => a.localeCompare(b))
    if (!ids[0] || !ids[1]) return ''
    return `healpath-${ids[0]}-${ids[1]}`
  }

  const openVideoCall = async (contactId) => {
    if (!contactId || creatingCall) return

    const roomName = getConversationRoomName(contactId)
    if (!roomName) return

    try {
      setCreatingCall(true)
      const loadingId = toast.loading('Checking participant availability...')

      // Check receiver online status via a small endpoint provided by the server
      const onlineRes = await API.get(`/calls/online/${contactId}`)
      const receiverOnline = onlineRes?.data?.online
      if (!receiverOnline) {
        toast.dismiss(loadingId)
        toast.error('The other user is offline. Video calls require both participants to be online.')
        setCreatingCall(false)
        return
      }

      // Receiver is online — remove the availability toast and proceed
      toast.dismiss(loadingId)
      const jitsiToastId = toast.loading('Opening Jitsi meeting...', { id: 'jitsi-call' })

      await API.post('/messages', { receiver: contactId, content: `VIDEO_CALL_INVITE:${roomName}` })

      setActiveCallRoom(roomName)
      setActiveCallUserName(localStorage.getItem('name') || 'Guest')
      toast.dismiss('jitsi-call')
      toast.success('Jitsi meeting ready')
    } catch (err) {
      console.error('Failed to start Jitsi call', err)
      toast.dismiss('jitsi-call')
      toast.error(err.response?.data?.msg || 'Failed to start video call')
    } finally {
      setCreatingCall(false)
    }
  }

  const deleteConversation = async (contactId) => {
    if (!contactId) return
    if (!confirm('Delete this conversation? This cannot be undone.')) return

    const tId = toast.loading('Deleting...')
    try {
      await API.delete(`/messages/conversations/${contactId}`)
      if (activeContact?._id === contactId) setActiveContact(null)
      fetchConversations()
      toast.success('Conversation deleted', { id: tId })
    } catch (err) {
      console.error(err)
      toast.error(err?.response?.data?.msg || 'Failed to delete conversation', { id: tId })
    }
  }

  const formatTime = (date) => {
    const d = new Date(date)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <DashboardShell title="Messages" subtitle="Communicate with your care team instantly.">
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        
        {/* Conversations Sidebar */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 sm:p-6 border-b border-slate-100">
            <div className="flex items-center justify-between mb-4 gap-2">
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Messages</h2>
              <button onClick={() => setShowNewChat(!showNewChat)} className="p-2 rounded-full bg-teal-600 text-white hover:bg-teal-700 transition" title="New message">
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 sm:py-3 pl-12 pr-4 text-sm outline-none focus:border-teal-300" placeholder="Search chats..." />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-2">
            {showNewChat && (
              <div className="mb-4">
                <p className="text-xs font-bold uppercase text-slate-400 mb-2">Start a new chat</p>
                {allUsers.map(user => (
                  <button key={user._id} onClick={() => openConversation(user)}
                    className="w-full flex items-center gap-3 rounded-2xl border border-teal-100 bg-teal-50 px-3 sm:px-4 py-2.5 sm:py-3 mb-1 text-left hover:bg-teal-100 transition">
                    <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm">
                      {user.name[0]}
                    </div>
                    <div className="min-w-0 overflow-hidden">
                      <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-400 capitalize truncate">{user.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {conversations.length === 0 && !showNewChat ? (
              <div className="text-center text-slate-400 py-8">
                <span className="material-symbols-outlined text-4xl mb-2 block">chat_bubble_outline</span>
                <p className="text-sm">No conversations yet</p>
                <button onClick={() => setShowNewChat(true)} className="mt-3 text-primary text-sm font-semibold hover:underline">Start a new chat</button>
              </div>
            ) : (
              conversations.map((conv) => {
                return (
                  <div key={conv.contact._id} className={`flex items-center rounded-3xl border px-3 py-2 sm:px-3 sm:py-3 transition ${activeContact?._id === conv.contact._id ? 'border-teal-100 bg-teal-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    <button type="button" onClick={() => openConversation(conv.contact)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                      <div className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                        {conv.contact.name[0]}
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">{conv.contact.name}</p>
                          <span className="text-[10px] text-slate-400">{formatTime(conv.lastTime)}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate overflow-hidden">{conv.lastMessage}</p>
                      </div>
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* Chat Window */}
        <section className="flex flex-col rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
          {!activeContact ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-6xl mb-4">forum</span>
              <p className="text-lg font-semibold">Select a conversation</p>
              <p className="text-sm">or start a new one to get started</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-base sm:text-lg">
                    {activeContact.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{activeContact.name}</p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-secondary font-medium">{activeContact.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {role === 'doctor' && (
                    <button
                      onClick={() => openVideoCall(activeContact._id)}
                      className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-2.5 py-2 text-xs sm:text-sm font-semibold text-primary hover:bg-teal-100 transition"
                      title="Start Video Call"
                    >
                      <span className="material-symbols-outlined">videocam</span>
                      Start Video Call
                    </button>
                  )}

                  <button
                    onClick={() => deleteConversation(activeContact._id)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-2.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                    title="Delete chat"
                  >
                    <span className="material-symbols-outlined">delete</span>
                    Delete Chat
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-slate-400 py-8">
                    <p className="text-sm">No messages yet. Say hello!</p>
                  </div>
                )}
                {messages.map((msg, i) => {
                  const isSent = msg.sender._id === currentUserId || msg.sender === currentUserId
                  const isVideoInvite = typeof msg.content === 'string' && msg.content.startsWith('VIDEO_CALL_INVITE:')
                  const inviteRoomName = isVideoInvite ? msg.content.replace('VIDEO_CALL_INVITE:', '') : ''
                  return (
                    <div key={i} className={`flex gap-2 sm:gap-3 max-w-[88%] sm:max-w-[80%] ${isSent ? 'ml-auto flex-row-reverse' : ''}`}>
                      {!isSent && (
                        <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold self-end flex-shrink-0">
                          {activeContact.name[0]}
                        </div>
                      )}
                      <div>
                        <div className={`rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm border ${isSent ? 'bg-teal-600 text-white rounded-br-none border-transparent' : 'bg-white text-slate-900 rounded-bl-none border-slate-100'}`}>
                          {msg.content && !isVideoInvite && <p className="text-sm leading-6 whitespace-pre-wrap">{msg.content}</p>}
                          {isVideoInvite && (
                            <div className="space-y-2">
                              <p className="text-sm leading-6">Video call invitation</p>
                              <p className="text-xs text-slate-400">Invitations are informational in the chat. Use the "Start Video Call" button above to initiate or join a call. Incoming call prompts will appear as a modal.</p>
                            </div>
                          )}
                          {msg.fileData && (
                            <div className="mt-2">
                              {msg.fileData.startsWith('data:image/') ? (
                                <img src={msg.fileData} alt="attachment" className="max-w-[200px] rounded-lg border border-slate-200" />
                              ) : (
                                <a href={msg.fileData} download={msg.fileName || 'attachment'} className="flex items-center gap-2 text-sm underline opacity-90 break-all">
                                  <span className="material-symbols-outlined text-sm shrink-0">attach_file</span>
                                  {msg.fileName || 'Download File'}
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                        <p className={`text-[10px] text-slate-400 mt-1 ${isSent ? 'text-right' : ''}`}>{formatTime(msg.date)}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-slate-100 bg-white p-3 sm:p-4 md:p-6">
                {selectedFile && (
                  <div className="mb-3 flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-sm text-slate-600 truncate flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">attach_file</span>
                      {selectedFile.name}
                    </span>
                    <button type="button" onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-red-500 transition">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                )}
                <form onSubmit={sendMessage} className="flex items-end gap-3">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="mb-1 grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-3xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition shrink-0">
                    <span className="material-symbols-outlined">attach_file</span>
                  </button>
                  <input type="file" className="hidden" ref={fileInputRef} onChange={e => setSelectedFile(e.target.files[0])} />
                  <div className="relative flex-1">
                    <textarea rows={1} value={newMessage} onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e) }}}
                      placeholder="Type your message..." className="w-full resize-none rounded-3xl border border-slate-200 bg-slate-100 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-slate-900 outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100" />
                  </div>
                  <button type="submit" disabled={sending || (!newMessage.trim() && !selectedFile)} className="mb-1 grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-3xl bg-teal-600 text-white shadow-lg hover:bg-teal-700 active:scale-95 transition disabled:opacity-50 shrink-0">
                    <span className="material-symbols-outlined">send</span>
                  </button>
                </form>
              </div>
            </>
          )}
        </section>
      </div>

      {incomingCallInvite && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <p className="text-lg font-semibold text-slate-900">Incoming video call</p>
            <p className="mt-2 text-sm text-slate-600">{incomingCallInvite.senderName} invited you to join a Jitsi meeting.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleAcceptInvite}
                className="inline-flex items-center justify-center rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={handleDeclineInvite}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      <JitsiCallModal
        isOpen={Boolean(activeCallRoom)}
        roomName={activeCallRoom}
        userName={activeCallUserName}
        onClose={() => setActiveCallRoom(null)}
      />
    </DashboardShell>
  )
}
