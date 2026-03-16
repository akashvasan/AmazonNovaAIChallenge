import { motion } from 'framer-motion'
import type { AgentName, AgentStatus } from '../types'

interface AgentInfo {
  key:      AgentName
  label:    string
  subtitle: string
  icon:     string
}

const AGENTS: AgentInfo[] = [
  { key: 'flight_agent', label: 'Flights',    subtitle: 'Amadeus API',      icon: '✈️' },
  { key: 'hotel_agent',  label: 'Hotels',     subtitle: 'Booking.com',      icon: '🏨' },
  { key: 'events_agent', label: 'Events',     subtitle: 'Ticketmaster',     icon: '🎟️' },
  { key: 'food_agent',   label: 'Restaurants',subtitle: 'Yelp Fusion',      icon: '🍽️' },
]

interface Props {
  statuses:       Record<AgentName, AgentStatus>
  activeAgents?:  AgentName[]   // highlight only these during feedback re-run
}

export default function AgentStatusBoard({ statuses, activeAgents }: Props) {
  return (
    <div className="w-full">
      <p className="text-center text-sm text-gray-400 mb-4 tracking-wider uppercase">
        Planning your trip
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {AGENTS.map((agent, i) => {
          const status     = statuses[agent.key]
          const isActive   = !activeAgents || activeAgents.includes(agent.key)
          const isRunning  = status === 'running' && isActive
          const isDone     = status === 'done'

          return (
            <motion.div
              key={agent.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isActive ? 1 : 0.35, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className={`
                relative rounded-xl p-4 border transition-all duration-300
                ${isDone
                  ? 'bg-forest/40 border-forest-light'
                  : isRunning
                    ? 'bg-navy-light/60 border-gold/40'
                    : 'bg-surface-2 border-surface-3'
                }
              `}
            >
              {/* Running glow */}
              {isRunning && (
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  animate={{ boxShadow: ['0 0 0px rgba(201,168,76,0)', '0 0 16px rgba(201,168,76,0.3)', '0 0 0px rgba(201,168,76,0)'] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}

              <div className="flex items-start justify-between">
                <span className="text-2xl">{agent.icon}</span>
                <StatusIcon status={isActive ? status : 'idle'} />
              </div>

              <p className="mt-2 font-semibold text-sm text-white">{agent.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{agent.subtitle}</p>

              {isRunning && (
                <motion.div
                  className="mt-2 h-0.5 bg-surface-3 rounded overflow-hidden"
                >
                  <motion.div
                    className="h-full bg-gold rounded"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: AgentStatus }) {
  if (status === 'done') {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
    )
  }

  if (status === 'running') {
    return (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-6 h-6 rounded-full border-2 border-surface-3 border-t-gold"
      />
    )
  }

  return (
    <div className="w-6 h-6 rounded-full border-2 border-surface-3" />
  )
}
