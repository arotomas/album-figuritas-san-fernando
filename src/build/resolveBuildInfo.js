import { execSync } from 'node:child_process'

function git(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

/** Metadata baked into each Vite build (Vercel env + local git). */
export function resolveBuildInfo() {
  const shaFull =
    process.env.VERCEL_GIT_COMMIT_SHA || git('git rev-parse HEAD') || 'unknown'
  const shaShort = shaFull.slice(0, 7)
  const branch =
    process.env.VERCEL_GIT_COMMIT_REF ||
    git('git rev-parse --abbrev-ref HEAD') ||
    'unknown'

  let environment = process.env.VERCEL_ENV || 'local'
  if (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production') {
    environment = 'production'
  }

  const deploymentUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : null

  return {
    shaShort,
    shaFull,
    branch,
    builtAt: new Date().toISOString(),
    environment,
    deploymentUrl,
    vercelProject: process.env.VERCEL_PROJECT_NAME || 'album-figuritas-san-fernando',
  }
}
