export function isDevMode() {
  return import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true'
}
