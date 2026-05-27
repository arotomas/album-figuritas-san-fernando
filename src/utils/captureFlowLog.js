export function captureFlowLog(tag, message, detail) {
  if (!import.meta.env.DEV) return
  const prefix = `[${tag}]`
  if (detail !== undefined) {
    console.info(prefix, message, detail)
  } else {
    console.info(prefix, message)
  }
}

export function captureFlowWarn(tag, message, detail) {
  if (!import.meta.env.DEV) return
  const prefix = `[${tag}]`
  if (detail !== undefined) {
    console.warn(prefix, message, detail)
  } else {
    console.warn(prefix, message)
  }
}
