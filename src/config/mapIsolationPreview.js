/**
 * Flags temporales de preview (revertir tras diagnóstico).
 */

/** Prueba extrema: norte fijo — sin transform/rotate/bearing en mapPane ni marcadores. */
export const MAP_TEST_NORTH_FIXED = true

export const MAP_ISOLATION_DISABLE_EXPLORATION_CAMERA = false
export const MAP_ISOLATION_DISABLE_MAP_ROTATION = MAP_TEST_NORTH_FIXED

/** Prueba controlada: no ejecutar syncOrigin en moveend (zoomend sigue activo). */
export const MAP_ROTATION_DISABLE_SYNC_ORIGIN_MOVEEND = false
