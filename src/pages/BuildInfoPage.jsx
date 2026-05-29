import { Link } from 'react-router-dom'
import { appBuildInfo } from '../build/appBuildInfo'

function Row({ label, value }) {
  return (
    <tr className="border-b border-white/10">
      <th className="py-3 pr-4 text-left text-sm font-semibold text-white/60">{label}</th>
      <td className="py-3 font-mono text-sm text-white break-all">{value}</td>
    </tr>
  )
}

export function BuildInfoPage() {
  return (
    <div className="min-h-app bg-zinc-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-lg">
        <p className="font-mono text-xs uppercase tracking-wide text-amber-300">
          Deploy audit
        </p>
        <h1 className="mt-2 text-2xl font-bold">Build info</h1>
        <p className="mt-2 text-sm text-white/70">
          Si el SHA de esta página no coincide con el cartel fijo arriba a la
          izquierda, estás viendo caché o un deploy distinto.
        </p>

        <table className="mt-6 w-full">
          <tbody>
            <Row label="Commit SHA (short)" value={appBuildInfo.shaShort} />
            <Row label="Commit SHA (full)" value={appBuildInfo.shaFull} />
            <Row label="Branch" value={appBuildInfo.branch} />
            <Row label="Build date (UTC)" value={appBuildInfo.builtAt} />
            <Row label="Environment" value={appBuildInfo.environment} />
            <Row label="Vercel project" value={appBuildInfo.vercelProject} />
            <Row
              label="Deployment URL"
              value={appBuildInfo.deploymentUrl ?? '— (local dev)'}
            />
          </tbody>
        </table>

        <Link
          to="/map"
          className="mt-8 inline-block rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white"
        >
          Ir al mapa
        </Link>
      </div>
    </div>
  )
}
