/**
 * Rechaza si la promesa no resuelve dentro de `ms` ms.
 */
export function withTimeout(promise, ms, label = 'operation') {
  if (!ms || ms <= 0) return promise

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label}_TIMEOUT`))
    }, ms)

    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timer)
        reject(error)
      },
    )
  })
}
