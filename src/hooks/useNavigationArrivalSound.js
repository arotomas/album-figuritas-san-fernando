import { useEffect, useRef } from 'react'
import { playGameSound } from '../services/audio'

/** Edge detector: dispara LLEGADA_A_DESTINO una sola vez por llegada. */
export function useNavigationArrivalSound(arrived) {
  const prevArrivedRef = useRef(false)

  useEffect(() => {
    if (arrived && !prevArrivedRef.current) {
      playGameSound('LLEGADA_A_DESTINO')
    }
    prevArrivedRef.current = Boolean(arrived)
  }, [arrived])
}
