/** Kill switch global — desactiva todo el sistema de SFX sin tocar preferencias del usuario. */
export const SOUNDS_ENABLED = true

/** Reservado para música ambiental futura. */
export const MUSIC_ENABLED = false

/** Valores por defecto al primer uso (persistidos en useAppStore). */
export const DEFAULT_USER_SOUNDS_ENABLED = true
export const DEFAULT_USER_MUSIC_ENABLED = false

/** Volumen maestro de efectos (0–1). */
export const DEFAULT_SOUND_VOLUME = 0.75

/**
 * Catálogo de assets en `public/sounds/`.
 * Intención funcional (cuándo usar cada sonido): docs/SOUND_LIBRARY.md
 * `src: null` = sin archivo; SoundService no reproduce ni precarga.
 */
export const SOUND_CATALOG = {
  figurita_detectada: {
    id: 'figurita_detectada',
    src: '/sounds/figurita-detectada.mp3',
    preload: true,
    volume: 0.55,
    description: 'Entrada al radio de detección de una figurita.',
  },
  camera_shutter: {
    id: 'camera_shutter',
    src: '/sounds/camera-shutter.mp3',
    preload: true,
    volume: 0.85,
    description: 'Disparo de cámara al capturar la foto.',
  },
  captura_exitosa: {
    id: 'captura_exitosa',
    src: '/sounds/captura-exitosa.mp3',
    preload: true,
    volume: 1,
    description: 'Foto guardada y desbloqueo confirmado.',
  },
  figurita_nueva_en_album: {
    id: 'figurita_nueva_en_album',
    src: '/sounds/figurita-nueva-album.mp3',
    preload: true,
    volume: 0.78,
    description: 'Animación de nueva figurita en el álbum.',
  },
  llegada_a_destino: {
    id: 'llegada_a_destino',
    src: '/sounds/llegada-destino.mp3',
    preload: true,
    volume: 0.62,
    description: 'Llegada al punto de navegación.',
  },
  error_o_fuera_de_rango: {
    id: 'error_o_fuera_de_rango',
    src: '/sounds/error-fuera-rango.mp3',
    preload: true,
    volume: 0.32,
    description: 'Intento de captura sin cumplir distancia o GPS.',
  },
  inicio_navegacion: {
    id: 'inicio_navegacion',
    src: '/sounds/inicio-navegacion.mp3',
    preload: true,
    volume: 0.58,
    description: 'Confirmación al iniciar navegación hacia un punto.',
  },
  cancelar_navegacion: {
    id: 'cancelar_navegacion',
    src: '/sounds/cancelar-navegacion.mp3',
    preload: true,
    volume: 0.45,
    description: 'Cierre suave al cancelar navegación activa.',
  },
  gps_encontrado: {
    id: 'gps_encontrado',
    src: '/sounds/gps-encontrado.mp3',
    preload: true,
    volume: 0.28,
    description: 'Primera señal GPS usable en la sesión.',
  },
  ganar_puntos: {
    id: 'ganar_puntos',
    src: '/sounds/ganar-puntos.mp3',
    preload: true,
    volume: 0.82,
    description: 'Mensaje "¡Ganaste! +X pts" en recompensa post-captura.',
  },
  camara_habilitada: {
    id: 'camara_habilitada',
    src: '/sounds/recompensa.mp3',
    preload: true,
    volume: 0.76,
    description: 'Zona válida + cámara lista — listo para capturar.',
  },
  ui_boton: {
    id: 'ui_boton',
    src: '/sounds/sonido-boton.mp3',
    preload: true,
    volume: 0.52,
    description: 'Feedback corto de botones y navegación UI.',
  },
}

/** Eventos de juego → id de sonido en SOUND_CATALOG. */
export const GAME_SOUND_EVENTS = {
  FIGURITA_DETECTADA: 'figurita_detectada',
  CAMERA_SHUTTER: 'camera_shutter',
  CAPTURA_EXITOSA: 'captura_exitosa',
  FIGURITA_NUEVA_EN_ALBUM: 'figurita_nueva_en_album',
  LLEGADA_A_DESTINO: 'llegada_a_destino',
  ERROR_O_FUERA_DE_RANGO: 'error_o_fuera_de_rango',
  INICIO_NAVEGACION: 'inicio_navegacion',
  CANCELAR_NAVEGACION: 'cancelar_navegacion',
  GPS_ENCONTRADO: 'gps_encontrado',
  GANAR_PUNTOS: 'ganar_puntos',
  CAMARA_HABILITADA: 'camara_habilitada',
  UI_BOTON: 'ui_boton',
}
