import { LAUNCH_DISCOVERY_ENABLED } from '../../config/launchDiscovery'
import { useLaunchProximityDiscovery } from '../../hooks/useLaunchProximityDiscovery'
import { LaunchDiscoveryToast } from './LaunchDiscoveryToast'

export function LaunchDiscoveryController() {
  useLaunchProximityDiscovery({ enabled: LAUNCH_DISCOVERY_ENABLED })

  if (!LAUNCH_DISCOVERY_ENABLED) return null

  return <LaunchDiscoveryToast />
}
