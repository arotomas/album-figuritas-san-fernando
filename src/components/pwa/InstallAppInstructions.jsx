export function InstallAppInstructions({ isIos, isSafari, isInAppBrowser, compact = false }) {
  if (isInAppBrowser) {
    return (
      <p className={compact ? 'text-xs leading-relaxed text-amber-950' : 'text-sm leading-relaxed text-ink'}>
        Para instalar la app, abrí esta página en{' '}
        <span className="font-semibold">Safari</span> (copiá el enlace o usá «Abrir en Safari»).
      </p>
    )
  }

  if (isIos) {
    return (
      <div className={compact ? 'space-y-1.5 text-xs leading-relaxed text-ink' : 'space-y-2 text-sm leading-relaxed text-muted'}>
        <p className={compact ? 'text-ink' : undefined}>
          {isSafari
            ? 'En iPhone, instalá la app desde Safari:'
            : 'En iPhone, usá el menú Compartir del navegador:'}
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Tocá <span className="font-semibold text-ink">Compartir</span>
            <span className="text-muted"> (cuadrado con flecha hacia arriba)</span>
          </li>
          <li>
            Elegí <span className="font-semibold text-ink">Añadir a pantalla de inicio</span>
          </li>
          <li>
            Confirmá con <span className="font-semibold text-ink">Añadir</span>
          </li>
        </ol>
        {!isSafari && !compact && (
          <p className="text-xs leading-relaxed">
            Si no ves esa opción, abrí el sitio en Safari para instalarla.
          </p>
        )}
      </div>
    )
  }

  return (
    <p className={compact ? 'text-xs leading-relaxed text-ink' : 'text-sm leading-relaxed text-muted'}>
      Abrí el menú del navegador <span className="font-semibold text-ink">(⋮)</span> y elegí{' '}
      <span className="font-semibold text-ink">Instalar aplicación</span> o{' '}
      <span className="font-semibold text-ink">Añadir a la pantalla de inicio</span>.
    </p>
  )
}
