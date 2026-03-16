import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DayPlan, DaySlot } from '../types'

// ── Icon maps ─────────────────────────────────────────────────────────────────

const TIME_ICONS: Record<DaySlot['time_of_day'], string> = {
  morning:   '🌅',
  afternoon: '☀️',
  evening:   '🌙',
}

const ACTIVITY_ICONS: Record<DaySlot['activity_type'], string> = {
  meal:       '🍽️',
  event:      '🎟️',
  free_place: '📍',
  travel:     '✈️',
}

const ACTIVITY_COLORS: Record<DaySlot['activity_type'], string> = {
  meal:       'text-amber-400',
  event:      'text-purple-400',
  free_place: 'text-emerald-400',
  travel:     'text-blue-400',
}

// ── SlotRow ───────────────────────────────────────────────────────────────────

function SlotRow({ slot, delay }: { slot: DaySlot; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-start gap-3 py-2.5 border-b border-surface-3 last:border-0"
    >
      {/* Time badge */}
      <span className="text-base flex-shrink-0 mt-0.5">{TIME_ICONS[slot.time_of_day]}</span>

      {/* Activity type chip */}
      <span className={`text-sm flex-shrink-0 mt-0.5 ${ACTIVITY_COLORS[slot.activity_type]}`}>
        {ACTIVITY_ICONS[slot.activity_type]}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-white text-sm font-medium leading-snug">{slot.title}</p>
          {slot.cost_usd > 0 && (
            <span className="text-xs text-gold font-semibold flex-shrink-0">
              ${slot.cost_usd}
            </span>
          )}
          {slot.cost_usd === 0 && (
            <span className="text-xs text-emerald-500 font-medium flex-shrink-0">Free</span>
          )}
        </div>

        {slot.description && (
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{slot.description}</p>
        )}
        {slot.location && !slot.description && (
          <p className="text-xs text-gray-500 mt-0.5">📍 {slot.location}</p>
        )}

        {slot.booking_url && (
          <a
            href={slot.booking_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gold/80 hover:text-gold underline underline-offset-2 mt-1 inline-block transition-colors"
          >
            Book tickets ↗
          </a>
        )}
      </div>
    </motion.div>
  )
}

// ── ItineraryCard ─────────────────────────────────────────────────────────────

interface Props {
  day:          DayPlan
  defaultOpen?: boolean
}

export default function ItineraryCard({ day, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  // Format date
  const dateObj = new Date(day.date + 'T12:00:00')
  const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="rounded-xl border border-surface-3 bg-surface-2 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-3 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold/20 border border-gold/40 flex items-center justify-center flex-shrink-0">
            <span className="text-gold font-bold text-sm">{day.day_number}</span>
          </div>
          <div className="text-left">
            <p className="text-white font-semibold text-sm">Day {day.day_number}</p>
            <p className="text-xs text-gray-500">{dateStr}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gold font-medium">
            ${day.day_total_usd.toLocaleString()}
          </span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-gray-500"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.span>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3">
              {day.slots.map((slot, i) => (
                <SlotRow key={i} slot={slot} delay={i * 0.05} />
              ))}

              <div className="mt-2 flex justify-end">
                <span className="text-xs text-gray-600">
                  Day total: <span className="text-gold font-semibold">${day.day_total_usd.toLocaleString()}</span>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
