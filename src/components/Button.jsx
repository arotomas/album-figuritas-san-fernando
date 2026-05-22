import { PremiumButton } from './ui/PremiumButton'

/** Wrapper — mantiene API existente, usa PremiumButton internamente */
export function Button(props) {
  return <PremiumButton {...props} />
}

export { PremiumButton }
