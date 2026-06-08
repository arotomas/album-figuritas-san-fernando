# Audio assets — inventario técnico

Inventario de archivos y eventos cableados.  
**Intención funcional (cuándo usar cada sonido):** ver [`docs/SOUND_LIBRARY.md`](./SOUND_LIBRARY.md).

Todos los archivos viven en `public/sounds/` y se referencian desde `src/config/audio.js`.

## Eventos activos (SOUND_CATALOG)

| Archivo | Evento | Asset de intención | Volumen relativo |
|---------|--------|-------------------|------------------|
| `figurita-detectada.mp3` | `FIGURITA_DETECTADA` | Figurita cercana (GPS) | 0.55 |
| `camera-shutter.mp3` | `CAMERA_SHUTTER` | ⚠️ Sonido de botón (deuda — ver SOUND_LIBRARY) | 0.85 |
| `captura-exitosa.mp3` | `CAPTURA_EXITOSA` | Escaneo exitoso | **1.00** |
| `figurita-nueva-album.mp3` | `FIGURITA_NUEVA_EN_ALBUM` | Figurita nueva encontrada | 0.78 |
| `llegada-destino.mp3` | `LLEGADA_A_DESTINO` | Llegada a destino | 0.62 |
| `error-fuera-rango.mp3` | `ERROR_O_FUERA_DE_RANGO` | Error | **0.32** |
| `inicio-navegacion.mp3` | `INICIO_NAVEGACION` | Sonido de botón | 0.58 |
| `cancelar-navegacion.mp3` | `CANCELAR_NAVEGACION` | Cerrar popup | 0.45 |
| `gps-encontrado.mp3` | `GPS_ENCONTRADO` | GPS encontrado | **0.28** |
| `ganar-puntos.mp3` | `GANAR_PUNTOS` | Ganar puntos | 0.82 |
| `recompensa.mp3` | `CAMARA_HABILITADA` | Recompensa (zona lista) | 0.76 |

Los volúmenes relativos se aplican sobre el volumen maestro (`DEFAULT_SOUND_VOLUME = 0.75`) en `src/config/audio.js`.

## Biblioteca sin evento cableado

| Archivo | Uso previsto (ver SOUND_LIBRARY) |
|---------|----------------------------------|
| `completar-album.mp3` | Álbum 100% completo |
| `nivel-desbloqueado.mp3` | Ranking / hitos (futuro) |
| `notificacion-push.mp3` | Push con app abierta |
| `cerrar-popup.mp3` | Fuente de `cancelar-navegacion` |
| `cerrar-popup-2.mp3` | Variante cierre |
| `error.mp3` | Fuente de `error-fuera-rango` |

## Mantenimiento

1. Colocar el MP3 en `public/sounds/`.
2. Documentar intención en `docs/SOUND_LIBRARY.md`.
3. Actualizar `SOUND_CATALOG` y, si aplica, `GAME_SOUND_EVENTS` en `src/config/audio.js`.
4. Añadir fila en la tabla de eventos activos de este archivo.

## Notas técnicas

- Precarga automática al boot vía `soundService.schedulePreload()` en `main.jsx`.
- Integración: `docs/AUDIO_UX_AUDIT.md`.
- Rutas siempre bajo `/sounds/`.
