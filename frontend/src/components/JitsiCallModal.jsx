import { useEffect } from 'react'
import { JitsiMeeting } from '@jitsi/react-sdk'

export default function JitsiCallModal({ isOpen, roomName, userName, onClose }) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !roomName) return null

  const displayName = userName || 'Guest'
  const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '')
  const meetingUrl = `https://meet.jit.si/${roomName}`

  const openInJitsiApp = () => {
    window.open(meetingUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-2 sm:p-4" onClick={onClose}>
      <div className="relative h-[95vh] w-full max-w-7xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 text-xl text-white transition hover:bg-slate-800"
          aria-label="Close video call"
        >
          ✕
        </button>

        {isMobile ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center sm:px-8">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 max-w-md">
              <p className="text-lg font-semibold text-slate-900">For the best experience on mobile, please use the Jitsi Meet app.</p>
              <p className="mt-2 text-sm text-slate-600">Tap below to open the call directly.</p>
              <button
                type="button"
                onClick={openInJitsiApp}
                className="mt-5 inline-flex items-center justify-center rounded-full bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                Open Jitsi Meet
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full w-full">
            <JitsiMeeting
              domain="meet.jit.si"
              roomName={roomName}
              jwt={undefined}
              userInfo={{ displayName, moderator: true }}
              configOverwrite={{
                moderator: true,
                prejoinPageEnabled: false,
                prejoinConfig: { enabled: false },
                disableInitialGUM: false,
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                requireDisplayName: false,
                enableWelcomePage: false,
                disableModeratorIndicator: true,
                enableUserRolesBasedOnToken: false,
                enableFeaturesBasedOnToken: false,
              }}
              interfaceConfigOverwrite={{
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                HIDE_INVITE_MORE_BUTTON: true,
                MOBILE_APP_PROMO: false,
                TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup', 'chat', 'fullscreen'],
              }}
              onReadyToClose={onClose}
              getIFrameRef={(iframeRef) => {
                iframeRef.style.height = '100%'
                iframeRef.style.width = '100%'
                iframeRef.style.border = '0'
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
