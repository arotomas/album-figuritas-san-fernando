import { useContext } from 'react'
import { GeolocationContext } from '../context/GeolocationContext'

/** GPS compartido del `GeolocationProvider` en AppLayout (un solo watchPosition). */
export function useAppGeolocation() {
  const value = useContext(GeolocationContext)
  if (!value) {
    throw new Error('useAppGeolocation requires GeolocationProvider')
  }
  return value
}
