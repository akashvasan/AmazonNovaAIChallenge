import { SessionProvider } from './context/SessionContext'
import SplashGate from './SplashGate'

export default function App() {
  return (
    <SessionProvider>
      <SplashGate />
    </SessionProvider>
  )
}
