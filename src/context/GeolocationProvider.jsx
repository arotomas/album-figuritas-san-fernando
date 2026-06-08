import { useGeolocationInternal } from '../hooks/useGeolocation'
import { GeolocationContext } from './GeolocationContext'

export function GeolocationProvider({ children }) {
  const value = useGeolocationInternal()
  return (
    <GeolocationContext.Provider value={value}>{children}</GeolocationContext.Provider>
  )
}
