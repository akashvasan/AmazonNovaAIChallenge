import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from './context/SessionContext'
import PlannerPage from './pages/PlannerPage'

export default function SplashGate() {
  const { sessionLoading, sessionId, sessionError, retrySession } = useSession()

  const showApp = !sessionLoading && !!sessionId

  return (
    <AnimatePresence mode="wait">
      {showApp ? (
        <motion.div
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <PlannerPage />
        </motion.div>
      ) : (
        <motion.div
          key="splash"
          className="flex flex-col items-center justify-center min-h-screen px-6"
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4 }}
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="mb-8 text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="text-5xl">✈️</span>
              <h1 className="text-5xl font-bold text-white tracking-tight">
                Nova <span className="text-gold">Travel</span>
              </h1>
            </div>
            <p className="text-gray-500 text-sm">Powered by Amazon Nova</p>
          </motion.div>

          {sessionLoading && (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="w-10 h-10 border-2 border-surface-3 border-t-gold rounded-full"
              />
              <p className="mt-4 text-xs text-gray-600">Establishing session…</p>
            </>
          )}

          {sessionError && !sessionLoading && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-sm"
            >
              <div className="bg-red-900/20 border border-red-800 rounded-xl px-5 py-4 mb-5">
                <p className="text-red-300 font-medium text-sm mb-1">Cannot reach backend</p>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Make sure the FastAPI server is running at{' '}
                  <span className="text-gray-300 font-mono">
                    {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}
                  </span>
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={retrySession}
                  className="w-full py-2.5 rounded-xl bg-gold text-navy font-semibold text-sm hover:bg-gold-light transition-colors"
                >
                  Retry
                </button>

                <div className="text-xs text-gray-600">or</div>

                <div className="bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 text-left">
                  <p className="text-gray-400 text-xs mb-2 font-medium">Run backend:</p>
                  <code className="text-xs text-green-400 font-mono block leading-relaxed">
                    cd backend<br />
                    pip install -r requirements.txt<br />
                    uvicorn main:app --reload
                  </code>
                </div>

                <div className="bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 text-left">
                  <p className="text-gray-400 text-xs mb-2 font-medium">Or use mock mode (no backend needed):</p>
                  <code className="text-xs text-gold font-mono block">
                    VITE_USE_MOCK=true npm run dev
                  </code>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
