import { memo } from 'react'
import { NavLink } from 'react-router-dom'
import { FaMapMarkedAlt, FaImages, FaCog } from 'react-icons/fa'
import { useQaMode } from '../utils/qaMode'

const tabs = [
  { to: '/my-figures', label: 'Mis figuritas', icon: FaImages },
  { to: '/map', label: 'Mapa', icon: FaMapMarkedAlt },
  { to: '/options', label: 'Opciones', icon: FaCog },
]

function BottomNavInner() {
  const { withQa } = useQaMode()

  return (
    <nav className="bottom-nav safe-bottom safe-x z-20 shrink-0 border-t border-border bg-white/95 backdrop-blur-md">
      <div className="grid grid-cols-3">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={withQa(to)}
            className={({ isActive }) =>
              `flex min-h-[52px] flex-col items-center justify-center gap-1 px-2 py-1.5 transition-colors ${
                isActive ? 'text-ink' : 'text-muted'
              }`
            }
            aria-label={label}
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform ${
                    isActive ? 'scale-105 bg-surface text-ink' : 'bg-border/60 text-gray-500'
                  }`}
                >
                  <Icon size={18} />
                </span>
                <span className="text-[11px] font-medium leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export const BottomNav = memo(BottomNavInner)
