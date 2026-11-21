import { useEffect } from 'react';

export default function DailyCallModal({ isOpen, roomUrl, token, onClose }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !roomUrl || !token) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative h-[95vh] w-full max-w-7xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 text-xl text-white transition hover:bg-slate-800"
          aria-label="Close video call"
        >
          ✕
        </button>

        <iframe
          title="Daily.co Video Call"
          src={`${roomUrl}?t=${token}`}
          allow="camera; microphone; fullscreen; display-capture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}
