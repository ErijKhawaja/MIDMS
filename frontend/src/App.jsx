import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Topbar          from './components/layout/Topbar'
import Sidebar         from './components/layout/Sidebar'
import BottomPanel     from './components/layout/BottomPanel'
import useMapStore     from './store/mapStore'
import './styles/globals.css'

const MonitoringPage  = lazy(() => import('./pages/MonitoringPage'))
const PredictionPage  = lazy(() => import('./pages/PredictionPage'))
const CorrelationPage = lazy(() => import('./pages/CorrelationPage'))
const ComparativePage = lazy(() => import('./pages/ComparativePage'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } }  // cache 5 min
})

export default function App() {
  const isChartOpen = useMapStore((state) => state.isChartOpen)

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex flex-col h-screen overflow-hidden bg-bg">
          <Topbar />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 relative overflow-hidden">
              <Suspense fallback={
                <div className="flex items-center justify-center w-full h-full text-muted" style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14 }}>
                  Loading...
                </div>
              }>
                <Routes>
                  <Route path="/"            element={<MonitoringPage />} />
                  <Route path="/prediction"  element={<PredictionPage />} />
                  <Route path="/correlation" element={<CorrelationPage />} />
                  <Route path="/comparative" element={<ComparativePage />} />
                </Routes>
              </Suspense>
            </main>
          </div>
          <div
            style={{
              height: isChartOpen ? 280 : 0,
              overflow: 'hidden',
              transition: 'height 0.3s ease',
              flexShrink: 0,
            }}
          >
            <BottomPanel />
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
