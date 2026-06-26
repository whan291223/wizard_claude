import { useState } from 'react'
import { EMOTE_PAGES as PAGES } from '../utils/emotePhrases'

interface EmotePickerProps {
  onSelect: (emote: string) => void
  onClose: () => void
}

export default function EmotePicker({ onSelect, onClose }: EmotePickerProps) {
  const [page, setPage] = useState(0)

  function handleSelect(emote: string) {
    onSelect(emote)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 border-t border-gray-700 rounded-t-2xl shadow-2xl pb-safe">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <button
            onClick={() => setPage((p) => (p - 1 + PAGES.length) % PAGES.length)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors"
          >
            ‹
          </button>

          <div className="flex gap-1.5">
            {PAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === page ? 'bg-purple-400' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setPage((p) => (p + 1) % PAGES.length)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors"
          >
            ›
          </button>
        </div>

        {/* Phrases grid — 2 columns */}
        <div className="grid grid-cols-2 gap-2 px-3 pb-4">
          {PAGES[page].map((phrase) => (
            <button
              key={phrase}
              onClick={() => handleSelect(phrase)}
              className="text-left text-xs text-white bg-gray-700 hover:bg-purple-700 active:bg-purple-800 px-3 py-2.5 rounded-xl leading-snug transition-colors"
            >
              {phrase}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
