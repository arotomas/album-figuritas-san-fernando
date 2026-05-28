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
        className="h-14 w-auto max-w-[min(72vw,300px)] object-contain object-left sm:h-16 sm:max-w-[min(76vw,340px)]"
        draggable={false}
      />
      <img
        src={LOGOS.municipio}
        alt="Municipalidad de San Fernando"
        className="h-11 w-auto max-w-[min(40vw,180px)] shrink-0 object-contain object-right sm:h-14 sm:max-w-[min(44vw,210px)]"
        draggable={false}
      />
    </header>
  )
}

export const AuthBrandHeader = memo(AuthBrandHeaderInner)
