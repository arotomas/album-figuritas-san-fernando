import { memo } from 'react'

const LOGOS = {
  albumHorizontal: '/assets/logos/logo-album-horizontal-black.svg',
  municipio: '/assets/logos/logo-municipio-black.svg',
}

function AuthBrandHeaderInner({ className = '' }) {
  return (
    <header
      className={`flex w-full shrink-0 items-center justify-between gap-2 sm:gap-3 ${className}`}
      aria-label="Álbum Figuritas de San Fernando"
    >
      <img
        src={LOGOS.albumHorizontal}
        alt="Álbum Figuritas de San Fernando"
        className="h-28 min-w-0 w-auto max-w-[58%] object-contain object-left sm:h-32 sm:max-w-[60%]"
        draggable={false}
      />
      <img
        src={LOGOS.municipio}
        alt="Municipalidad de San Fernando"
        className="h-[5.5rem] w-auto max-w-[40%] shrink-0 object-contain object-right sm:h-28 sm:max-w-[38%]"
        draggable={false}
      />
    </header>
  )
}

export const AuthBrandHeader = memo(AuthBrandHeaderInner)
