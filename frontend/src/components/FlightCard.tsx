import { motion } from 'framer-motion'
import type { FlightOption } from '../types'

interface Props {
  flight:    FlightOption
  selected?: boolean
  onClick?:  () => void
}

export default function FlightCard({ flight, selected = false, onClick }: Props) {
  return (
    <motion.div
      whileHover={{ scale: onClick ? 1.01 : 1 }}
      onClick={onClick}
      className={`
        rounded-xl border p-4 transition-all duration-200
        ${selected
          ? 'bg-navy-light border-gold shadow-[0_0_20px_rgba(201,168,76,0.25)]'
          : 'bg-surface-2 border-surface-3 hover:border-navy-light'
        }
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✈️</span>
          <div>
            <p className="font-semibold text-white text-sm">{flight.airline}</p>
            <p className="text-xs text-gray-500">{flight.flight_number}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-gold font-bold text-lg">${flight.price_usd.toLocaleString()}</p>
          <p className="text-xs text-gray-500">per person</p>
        </div>
      </div>

      {/* Route timeline */}
      <div className="flex items-center gap-2 py-2">
        <div className="text-center min-w-[52px]">
          <p className="text-white font-bold text-base">{flight.departure_time}</p>
          <p className="text-xs text-gray-400 font-medium">{flight.origin}</p>
        </div>

        <div className="flex-1 flex flex-col items-center gap-1">
          <p className="text-xs text-gray-500">{flight.duration}</p>
          <div className="w-full flex items-center gap-1">
            <div className="w-2 h-2 rounded-full border-2 border-gold flex-shrink-0" />
            <div className="flex-1 h-px bg-gradient-to-r from-gold/60 to-gold/20" />
            <span className="text-gold text-xs">›</span>
            <div className="flex-1 h-px bg-gradient-to-r from-gold/20 to-gold/60" />
            <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
          </div>
          <p className="text-xs text-gray-600">nonstop</p>
        </div>

        <div className="text-center min-w-[52px]">
          <p className="text-white font-bold text-base">{flight.arrival_time}</p>
          <p className="text-xs text-gray-400 font-medium">{flight.destination}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-surface-3">
        <span className="text-xs text-gray-500">
          {flight.origin} → {flight.destination}
        </span>
        {flight.booking_url && (
          <a
            href={flight.booking_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-xs text-gold hover:text-gold-light underline underline-offset-2 transition-colors"
          >
            View deal ↗
          </a>
        )}
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex items-center gap-1"
        >
          <span className="w-4 h-4 rounded-full bg-gold flex items-center justify-center">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-xs text-gold font-medium">Selected for booking</span>
        </motion.div>
      )}
    </motion.div>
  )
}
