/** Injected at compile time via vite.config.js `define`. */
// eslint-disable-next-line no-undef
export const appBuildInfo = __APP_BUILD_INFO__

export function formatBuildLabel() {
  return `BUILD SHA: ${appBuildInfo.shaShort}`
}
