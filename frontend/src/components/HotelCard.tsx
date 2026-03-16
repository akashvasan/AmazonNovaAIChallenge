import { motion } from 'framer-motion'
import type { HotelOption } from '../types'

interface Props {
  hotel:     HotelOption
  nights?:   number
  selected?: boolean
  onClick?:  () => void
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg
          key={i}
          width="12" height="12"
          viewBox="0 0 24 24"
          fill={i <= rating ? '#c9a84c' : 'none'}
          stroke={i <= rating ? '#c9a84c' : '#4b5563'}
          strokeWidth="2"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  )
}

export default function HotelCard({ hotel, nights, selected = false, onClick }: Props) {
  return (
    <motion.div
      whileHover={{ scale: onClick ? 1.01 : 1 }}
      onClick={onClick}
      className={`
        rounded-xl border overflow-hidden transition-all duration-200
        ${selected
          ? 'bg-navy-light border-gold shadow-[0_0_20px_rgba(201,168,76,0.25)]'
          : 'bg-surface-2 border-surface-3 hover:border-navy-light'
        }
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      {/* Image placeholder / gradient header */}
      <div className="h-24 bg-gradient-to-br from-forest/60 to-navy/80 flex items-center justify-center relative overflow-hidden">
        <span className="text-4xl opacity-60">🏨</span>
        <div className="absolute inset-0 bg-gradient-to-t from-surface-2/80 to-transparent" />
        <div className="absolute bottom-2 right-3">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            hotel.star_rating >= 4 ? 'bg-gold text-navy' : 'bg-surface-3 text-gray-300'
          }`}>
            {hotel.star_rating >= 4 ? 'Premium' : 'Standard'}
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* Name + stars */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-semibold text-white text-sm leading-snug">{hotel.name}</p>
          <StarRating rating={Math.round(hotel.star_rating)} />
        </div>

        <p className="text-xs text-gray-500 mb-3 truncate">{hotel.address}</p>

        {/* Price */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-gold font-bold text-lg">
              ${hotel.price_per_night_usd.toLocaleString()}
              <span className="text-xs text-gray-400 font-normal"> / night</span>
            </p>
            {nights && (
              <p className="text-xs text-gray-500">
                ${hotel.total_price_usd.toLocaleString()} total · {nights} nights
              </p>
            )}
          </div>
          {hotel.booking_url && (
            <a
              href={hotel.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-xs text-gold hover:text-gold-light underline underline-offset-2 transition-colors"
            >
              View ↗
            </a>
          )}
        </div>

        {/* Amenities */}
        {hotel.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {hotel.amenities.slice(0, 5).map(a => (
              <span
                key={a}
                className="text-xs bg-surface-3 text-gray-300 px-2 py-0.5 rounded-full"
              >
                {a}
              </span>
            ))}
          </div>
        )}

        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-1"
          >
            <span className="w-4 h-4 rounded-full bg-gold flex items-center justify-center">
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-xs text-gold font-medium">Selected for booking</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
