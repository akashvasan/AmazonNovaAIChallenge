import { motion } from 'framer-motion'
import type { BookingResult, Itinerary } from '../types'

interface Props {
  result:     BookingResult
  itinerary:  Itinerary
}

function ConfirmCard({
  icon,
  title,
  subtitle,
  confirmation,
  delay,
  success,
}: {
  icon:         string
  title:        string
  subtitle:     string
  confirmation?: string
  delay:        number
  success:      boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
      className={`
        flex-1 rounded-xl border p-5 text-center
        ${success
          ? 'bg-forest/30 border-forest-light'
          : 'bg-surface-2 border-surface-3'
        }
      `}
    >
      <span className="text-3xl">{icon}</span>

      {success && confirmation && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.2, type: 'spring', stiffness: 400 }}
          className="w-10 h-10 rounded-full bg-green-500 mx-auto mt-2 mb-3 flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3.5 9.5L7 13 14.5 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      )}

      {!success || !confirmation && (
        <div className="w-10 h-10 rounded-full bg-surface-3 mx-auto mt-2 mb-3 flex items-center justify-center">
          <span className="text-gray-400 text-xl">→</span>
        </div>
      )}

      <p className="font-bold text-white text-sm mb-1">{title}</p>
      <p className="text-xs text-gray-500 mb-2">{subtitle}</p>

      {confirmation ? (
        <div className="bg-surface-3 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-500 mb-0.5">Confirmation #</p>
          <p className="font-mono font-bold text-gold text-sm tracking-wider">{confirmation}</p>
        </div>
      ) : (
        <p className="text-xs text-gray-500 italic">Book independently via the links above</p>
      )}
    </motion.div>
  )
}

function EventsLinksCard({ itinerary, delay }: { itinerary: Itinerary; delay: number }) {
  const bookableEvents = itinerary.events.filter(e => e.booking_url)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
      className="flex-1 rounded-xl border border-surface-3 bg-surface-2 p-5"
    >
      <span className="text-3xl">🎟️</span>
      <div className="w-10 h-10 rounded-full bg-surface-3 mx-auto mt-2 mb-3 flex items-center justify-center">
        <span className="text-gray-300 text-lg">↗</span>
      </div>
      <p className="font-bold text-white text-sm mb-1">Events & Dining</p>
      <p className="text-xs text-gray-500 mb-3">Book these independently</p>

      <div className="space-y-2">
        {bookableEvents.slice(0, 3).map(evt => (
          <a
            key={evt.name}
            href={evt.booking_url!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-xs bg-surface-3 rounded-lg px-3 py-2 hover:border-gold/30 border border-transparent transition-colors group"
          >
            <span className="text-gray-300 group-hover:text-white transition-colors truncate">{evt.name}</span>
            <span className="text-gold ml-2 flex-shrink-0">↗</span>
          </a>
        ))}
        {bookableEvents.length === 0 && (
          <p className="text-xs text-gray-600 italic">No ticketed events in this itinerary</p>
        )}
      </div>
    </motion.div>
  )
}

export default function BookingResultRow({ result, itinerary }: Props) {
  return (
    <div>
      {/* Status banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`
          rounded-xl border px-4 py-3 mb-6 flex items-center gap-3
          ${result.success
            ? 'bg-forest/20 border-forest-light'
            : 'bg-red-900/20 border-red-800'
          }
        `}
      >
        <span className="text-xl">{result.success ? '🎉' : '⚠️'}</span>
        <div>
          <p className={`font-semibold text-sm ${result.success ? 'text-emerald-300' : 'text-red-300'}`}>
            {result.success ? 'Booking Confirmed!' : 'Booking Issue'}
          </p>
          {result.error_message && (
            <p className="text-xs text-red-400 mt-0.5">{result.error_message}</p>
          )}
        </div>
      </motion.div>

      {/* Three cards */}
      <div className="flex flex-col sm:flex-row gap-3">
        <ConfirmCard
          icon="✈️"
          title="Flight Booked"
          subtitle={`${itinerary.flight.airline} ${itinerary.flight.flight_number}`}
          confirmation={result.flight_confirmation}
          delay={0}
          success={result.success && !!result.flight_confirmation}
        />

        <EventsLinksCard itinerary={itinerary} delay={0.1} />

        <ConfirmCard
          icon="🏨"
          title="Hotel Booked"
          subtitle={itinerary.hotel.name}
          confirmation={result.hotel_confirmation}
          delay={0.2}
          success={result.success && !!result.hotel_confirmation}
        />
      </div>
    </div>
  )
}
