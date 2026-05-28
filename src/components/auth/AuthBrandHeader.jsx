import { memo } from 'react'

const LOGOS = {
  albumHorizontal: '/assets/logos/logo-album-horizontal-black.svg',
  municipio: '/assets/logos/logo-municipio-black.svg',
}

function AuthBrandHeaderInner({ className = '' }) {
  return (
    <header
      className={`flex shrink-0 items-center justify-between gap-4 ${className}`}
      aria-label="Álbum Figuritas de San Fernando"
    >
      <img
        src={LOGOS.albumHorizontal}
        alt="Álbum Figuritas de San Fernando"
        className="h-[2.35rem] w-auto max-w-[min(58vw,240px)] object-contain object-left"
        draggable={false}
      />
      <img
        src={LOGOS.municipio}
        alt="Municipalidad de San Fernando"
        className="h-8 w-auto max-w-[min(36vw,148px)] shrink-0 object-contain object-right"
        draggable={false}
      />
    </header>
  )
}

export const AuthBrandHeader = memo(AuthBrandHeaderInner)
