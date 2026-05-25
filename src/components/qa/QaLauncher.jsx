import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  isDebugRevealEnabled,
  isGpsPanelVisible,
  isLocationPanelVisible,
  openQaPanel,
  resetQaAll,
  toggleDebugRevealOverride,
  toggleQaPanel,
} from '../../qa/qaCore'
import { useQaCore } from '../../qa/useQaCore'
import { logUniverseEventsSnapshot } from '../../utils/universeDiagnostics'

const ACTIONS = [
  { id: 'gps', label: 'GPS' },
  { id: 'teleport', label: 'Teleport' },
  { id: 'availability', label: 'Availability' },
  { id: 'reveal', label: 'Reveal' },
  { id: 'events', label: 'Events' },
  { id: 'reset', label: 'Reset QA' },
]

export function QaLauncher() {
  const { showQaTools, withQa } = useQaCore()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  if (!showQaTools) return null

  const handleAction = (id) => {
    switch (id) {
      case 'gps':
        if (location.pathname !== '/map') {
          openQaPanel('gps')
          navigate(withQa('/map'))
        } else {
          toggleQaPanel('gps')
        }
        break
      case 'teleport':
        openQaPanel('location')
        if (location.pathname !== '/map') {
          navigate(withQa('/map'))
        }
        break
      case 'availability':
        navigate(withQa('/my-figures'))
        break
      case 'reveal':
        toggleDebugRevealOverride()
        break
      case 'events':
        logUniverseEventsSnapshot()
        if (location.pathname.startsWith('/admin')) {
          navigate(withQa('/admin/events'))
        }
        break
      case 'reset':
        resetQaAll()
        break
      default:
        break
    }
    setOpen(false)
  }

  return (
    <div className="pointer-events-auto fixed bottom-20 right-3 z-[600] flex flex-col items-end gap-2">
      {open && (
        <div className="w-44 overflow-hidden rounded-xl border border-white/15 bg-zinc-950/95 shadow-lg backdrop-blur-md">
          <p className="border-b border-white/10 px-3 py-2 font-sans text-[10px] font-bold uppercase tracking-wide text-amber-200">
            QA Launcher
          </p>
          <ul className="py-1">
            {ACTIONS.map((action) => (
              <li key={action.id}>
                <button
                  type="button"
                  onClick={() => handleAction(action.id)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left font-sans text-xs text-white/90 hover:bg-white/5"
                >
                  <span>{action.label}</span>
                  {action.id === 'gps' && isGpsPanelVisible() && (
                    <span className="text-[9px] text-emerald-300">on</span>
                  )}
                  {action.id === 'teleport' && isLocationPanelVisible() && (
                    <span className="text-[9px] text-emerald-300">on</span>
                  )}
                  {action.id === 'reveal' && isDebugRevealEnabled() && (
                    <span className="text-[9px] text-emerald-300">on</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 min-h-[44px] items-center gap-2 rounded-full border border-amber-400/40 bg-zinc-950/95 px-4 font-sans text-[11px] font-bold uppercase tracking-wide text-amber-100 shadow-lg"
        aria-expanded={open}
        aria-label="Abrir launcher QA"
      >
        QA
      </button>
    </div>
  )
}
