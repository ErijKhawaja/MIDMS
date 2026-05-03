import { useNavigate, useLocation } from 'react-router-dom'
import { Activity, TrendingUp, GitBranch, LayoutGrid } from 'lucide-react'

const MODULES = [
  { id: 'monitoring',  path: '/',            label: 'Monitoring',   icon: Activity   },
  { id: 'prediction',  path: '/prediction',  label: 'Prediction',   icon: TrendingUp },
  { id: 'correlation', path: '/correlation', label: 'Correlation',  icon: GitBranch  },
  { id: 'comparative', path: '/comparative', label: 'Comparative',  icon: LayoutGrid },
]

export default function Topbar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <header
      className="flex items-center justify-between px-5 border-b shrink-0"
      style={{
        height: '56px',
        background: '#0d1929',
        borderColor: '#1e3a5f',
      }}
    >
      {/* Branding */}
      <div className="flex items-center gap-3">
        {/* Drought indicator icon */}
        <div className="w-7 h-7 rounded flex items-center justify-center"
             style={{ background: 'rgba(200,150,62,0.15)', border: '1px solid rgba(200,150,62,0.3)' }}>
          <span style={{ color: '#C8963E', fontSize: 14 }}>◈</span>
        </div>
        <div>
          <span className="font-display text-text" style={{ fontSize: 15, letterSpacing: '0.02em' }}>
            MIDMS
          </span>
          <span className="text-muted ml-2" style={{ fontSize: 11 }}>
            Multi-Index Drought Monitoring System
          </span>
        </div>
      </div>

      {/* Module tabs */}
      <nav className="flex items-center gap-1">
        {MODULES.map(({ id, path, label, icon: Icon }) => {
          const isActive = pathname === path
          return (
            <button
              key={id}
              onClick={() => navigate(path)}
              className="flex items-center gap-2 px-4 py-1.5 rounded transition-all"
              style={{
                fontSize:    12,
                fontWeight:  500,
                letterSpacing: '0.04em',
                color:       isActive ? '#C8963E' : '#6B7FA3',
                background:  isActive ? 'rgba(200,150,62,0.1)'  : 'transparent',
                border:      isActive ? '1px solid rgba(200,150,62,0.25)' : '1px solid transparent',
              }}
            >
              <Icon size={13} />
              {label}
            </button>
          )
        })}
      </nav>

      {/* Right side info */}
      <div className="text-muted" style={{ fontSize: 11 }}>
        Pakistan Drought System • v1.0
      </div>
    </header>
  )
}
