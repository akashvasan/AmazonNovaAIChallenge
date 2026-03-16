import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { UserPreferences } from '../types'

interface Props {
  preferences: UserPreferences
}

type PillColor = 'red' | 'amber' | 'green' | 'blue' | 'purple'

function Pill({ label, color = 'blue' }: { label: string; color?: PillColor }) {
  const colorMap: Record<PillColor, string> = {
    red:    'bg-red-900/40 text-red-300 border-red-800',
    amber:  'bg-amber-900/40 text-amber-300 border-amber-800',
    green:  'bg-emerald-900/40 text-emerald-300 border-emerald-800',
    blue:   'bg-blue-900/40 text-blue-300 border-blue-800',
    purple: 'bg-purple-900/40 text-purple-300 border-purple-800',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${colorMap[color]}`}>
      {label}
    </span>
  )
}

function PrefSection({
  icon,
  label,
  items,
  color,
  emptyText,
}: {
  icon:      string
  label:     string
  items:     string[]
  color:     PillColor
  emptyText: string
}) {
  if (items.length === 0 && !emptyText) return null
  return (
    <div className="mb-3">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">
        {icon} {label}
      </p>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map(item => (
            <Pill key={item} label={item} color={color} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-600 italic">{emptyText}</p>
      )}
    </div>
  )
}

export default function PreferenceMemoryDrawer({ preferences }: Props) {
  const [open, setOpen] = useState(false)

  const hasAnyPreference =
    preferences.dietary_restrictions.length > 0 ||
    preferences.disliked_cuisines.length > 0 ||
    preferences.preferred_cuisines.length > 0 ||
    preferences.flight_time !== null ||
    preferences.hotel_preferences.length > 0 ||
    preferences.accessibility_needs.length > 0

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40
          bg-surface-2 border border-surface-3 border-r-0
          rounded-l-xl px-2 py-4
          flex flex-col items-center gap-1
          hover:bg-surface-3 transition-colors"
        title="View remembered preferences"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <span className="text-xs text-gold" style={{ writingMode: 'vertical-rl' }}>Memory</span>
        {hasAnyPreference && (
          <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
        )}
      </button>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/40"
            />

            {/* Panel */}
            <motion.aside
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed right-0 top-0 h-full z-50 w-72 bg-surface border-l border-surface-3 shadow-2xl overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-surface-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🧠</span>
                  <p className="font-semibold text-white text-sm">Preference Memory</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-500 hover:text-white transition-colors p-1"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="px-4 py-4">
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  These preferences are remembered across your conversation and applied automatically.
                </p>

                {!hasAnyPreference ? (
                  <div className="text-center py-8">
                    <span className="text-3xl">🎤</span>
                    <p className="text-sm text-gray-500 mt-2">
                      No preferences captured yet. Try saying something like "I don't eat seafood" or "I prefer morning flights".
                    </p>
                  </div>
                ) : (
                  <>
                    <PrefSection
                      icon="🚫"
                      label="Dietary restrictions"
                      items={preferences.dietary_restrictions}
                      color="red"
                      emptyText=""
                    />
                    <PrefSection
                      icon="👎"
                      label="Disliked cuisines"
                      items={preferences.disliked_cuisines}
                      color="amber"
                      emptyText=""
                    />
                    <PrefSection
                      icon="❤️"
                      label="Preferred cuisines"
                      items={preferences.preferred_cuisines}
                      color="green"
                      emptyText=""
                    />
                    {preferences.flight_time && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">✈️ Flight time</p>
                        <Pill label={preferences.flight_time} color="blue" />
                      </div>
                    )}
                    <PrefSection
                      icon="🏨"
                      label="Hotel must-haves"
                      items={preferences.hotel_preferences}
                      color="purple"
                      emptyText=""
                    />
                    <PrefSection
                      icon="♿"
                      label="Accessibility"
                      items={preferences.accessibility_needs}
                      color="blue"
                      emptyText=""
                    />
                  </>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
