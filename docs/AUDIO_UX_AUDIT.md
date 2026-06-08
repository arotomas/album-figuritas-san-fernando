# Audio UX — auditoría e integración

Infraestructura de sonido para el Álbum de Figuritas de San Fernando.

> **Biblioteca e intención funcional:** [`docs/SOUND_LIBRARY.md`](./SOUND_LIBRARY.md) (fuente de verdad).  
> **Inventario técnico:** [`docs/AUDIO_ASSETS.md`](./AUDIO_ASSETS.md).

## Principios

- Reutilizar la biblioteca oficial antes de agregar SFX nuevos (ver `SOUND_LIBRARY.md`).
- Sonidos de **UI** (botón, cerrar) separados de **exploración**, **captura** y **logros**.
- Sonidos solo en momentos significativos; el botón de interfaz no debe usarse en capturas ni recompensas.
- Toggle de usuario en **Opciones → Sonido**.
- Kill switch de desarrollo: `SOUNDS_ENABLED` en `src/config/audio.js`.
- En iOS/Android el interruptor de silencio del dispositivo suele mutar `<audio>` automáticamente; no hay API fiable para leerlo en web.
- `prefers-reduced-motion: reduce` también silencia efectos (alineado con hápticos).

## Arquitectura

| Pieza | Ruta |
|-------|------|
| Flags y catálogo | `src/config/audio.js` |
| Motor (play/stop/volumen/mute) | `src/services/audio/SoundService.js` |
| API de eventos de juego | `src/services/audio/playGameSound.js` |
| Llegada navegación | `src/hooks/useNavigationArrivalSound.js` |
| GPS listo (sesión) | `src/hooks/useGpsReadySound.js` |
| Preferencias usuario | `useAppStore.soundsEnabled` / `musicEnabled` |

### API rápida

```js
import { playGameSound } from '../services/audio'

playGameSound('FIGURITA_DETECTADA')
```

```js
import { soundService } from '../services/audio'

soundService.setVolume(0.6)
soundService.mute()
soundService.unmute()
soundService.stop('captura_exitosa')
```

## Eventos y puntos de integración

| Evento | Cuándo | Componente / hook | Función / efecto |
|--------|--------|-------------------|------------------|
| `FIGURITA_DETECTADA` | Entra al radio de detección | `LeafletMapView.jsx` | Efecto `nearFigure` — junto a `vibrateFigureProximityAlert` |
| `CAPTURA_EXITOSA` | Foto guardada y unlock OK | `useCaptureFlow.js` | `runObtainAndReward` — tras `captureLog.unlockSuccess` |
| `FIGURITA_NUEVA_EN_ALBUM` | Confirmación visual en álbum | `UnlockAnimation.jsx` | `useEffect` de montaje — junto a `vibrateUnlock` |
| `LLEGADA_A_DESTINO` | Navegación: dentro de `ARRIVAL_RADIUS_METERS` | `NavigationMetricsPanel.jsx` | `useNavigationArrivalSound(arrived)` |
| `ERROR_O_FUERA_DE_RANGO` | Captura sin GPS o fuera de radio | `useCaptureFlow.js` | `validateDistanceForOpen` — al bloquear |
| `INICIO_NAVEGACION` | Confirma destino en mapa o álbum | `LeafletMapView.jsx` / `startFigureExploration.js` | `handleConfirmTarget` / `startFigureExploration` |
| `CANCELAR_NAVEGACION` | Usuario cancela seguimiento | `LeafletMapView.jsx` / `MapScreen.jsx` | `handleCancelTracking` / `handleExitExploration` |
| `GPS_ENCONTRADO` | Primera señal usable tras búsqueda | `LeafletMapView.jsx` | `useGpsReadySound(gpsPhase, hasPosition)` — una vez por sesión |

## Dónde colocar archivos

1. Crear carpeta `public/sounds/`.
2. Añadir archivos (recomendado: **mp3** cortos, &lt; 100 KB, mono, 44.1 kHz o 48 kHz).
3. En `src/config/audio.js`, asignar rutas en `SOUND_CATALOG`:

```js
figurita_detectada: {
  id: 'figurita_detectada',
  src: '/sounds/figurita-detectada.mp3',
  preload: true,
  description: '...',
},
```

4. Recargar la app; `soundService.schedulePreload()` en `main.jsx` precargará solo entradas con `src` definido.

## Cómo agregar un sonido nuevo

1. Revisar `docs/SOUND_LIBRARY.md` — ¿un asset existente cubre el caso?
2. Añadir entrada en `SOUND_CATALOG` con `id`, `src`, `preload`.
3. Añadir clave en `GAME_SOUND_EVENTS`.
4. Llamar `playGameSound('NUEVO_EVENTO')` en el punto de UX deseado (idealmente junto al háptico equivalente en `vibration.js`).
5. Actualizar `SOUND_LIBRARY.md` (intención) y `AUDIO_ASSETS.md` (inventario).
6. Opcional: cooldown por id en `SoundService` si el evento puede repetirse muy seguido.

## Configuración

| Flag | Ubicación | Rol |
|------|-----------|-----|
| `SOUNDS_ENABLED` | `config/audio.js` | Master dev/prod para todo SFX |
| `MUSIC_ENABLED` | `config/audio.js` | Reservado — música aún no implementada |
| `soundsEnabled` | `useAppStore` (persistido) | Preferencia del usuario |
| `musicEnabled` | `useAppStore` (persistido) | Reservado — toggle visible pero deshabilitado hasta `MUSIC_ENABLED` |

UI: **Opciones → Sonido y experiencia**.

## Rendimiento

- Precarga diferida (`requestIdleCallback` o timeout) — no bloquea boot ni GPS.
- `play()` es async vía `HTMLAudioElement`; no toca el hilo de animación ni Leaflet.
- Mismo `soundId` no se superpone: segunda llamada se ignora mientras suena.
- Sin archivos = sin instancias `Audio` creadas.

## Pendiente / fuera de alcance actual

- `recompensa.mp3` → evento cámara habilitada en zona (antes de captura).
- `ganar-puntos.mp3` → burst de puntos post-captura.
- `notificacion-push.mp3` → push con app en foreground.
- Sonido de botón en splash, tabs y apertura de pantallas (UI general).
- `nivel-desbloqueado.mp3`, `completar-album.mp3` → logros futuros.
- `CAMERA_SHUTTER` usa botón hoy — deuda vs. `SOUND_LIBRARY.md`; falta asset de disparo o silenciar.
- Música ambiental de mapa.
