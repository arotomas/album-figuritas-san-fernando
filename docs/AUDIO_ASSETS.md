# Audio assets — licencias y asignación

Primera versión de efectos de sonido para el Álbum de Figuritas de San Fernando.  
Todos los archivos provienen del pack **Kenney Interface Sounds** (CC0), convertidos a MP3 mono 96 kbps para uso web.

## Fuente y licencia

| Campo | Valor |
|-------|-------|
| Pack | [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds) |
| Descarga original | [OpenGameArt — kenney_interfaceSounds.zip](https://opengameart.org/content/interface-sounds) |
| Licencia | **CC0 1.0 Universal** (dominio público) |
| Uso comercial | Permitido sin atribución obligatoria |
| Atribución recomendada | Kenney (www.kenney.nl) — opcional |

## Archivos en `public/sounds/`

| Archivo | Evento | Origen (OGG) | Duración | Tamaño | Volumen relativo |
|---------|--------|--------------|----------|--------|------------------|
| `figurita-detectada.mp3` | `FIGURITA_DETECTADA` | `pluck_001.ogg` | ~0.13 s | ~2 KB | 0.55 |
| `captura-exitosa.mp3` | `CAPTURA_EXITOSA` | `confirmation_002.ogg` | ~0.57 s | ~7 KB | **1.00** (hero) |
| `figurita-nueva-album.mp3` | `FIGURITA_NUEVA_EN_ALBUM` | `confirmation_004.ogg` | ~0.52 s | ~7 KB | 0.78 |
| `llegada-destino.mp3` | `LLEGADA_A_DESTINO` | `maximize_007.ogg` | ~0.21 s | ~3 KB | 0.62 |
| `error-fuera-rango.mp3` | `ERROR_O_FUERA_DE_RANGO` | `error_004.ogg` | ~0.13 s | ~2 KB | **0.32** (más discreto) |
| `inicio-navegacion.mp3` | `INICIO_NAVEGACION` | `confirmation_001.ogg` | ~0.28 s | ~4 KB | 0.58 |
| `cancelar-navegacion.mp3` | `CANCELAR_NAVEGACION` | `back_001.ogg` | ~0.10 s | ~2 KB | 0.45 |
| `gps-encontrado.mp3` | `GPS_ENCONTRADO` | `tick_001.ogg` | ~0.05 s | ~1 KB | **0.28** (muy discreto) |

Los volúmenes relativos se aplican sobre el volumen maestro (`DEFAULT_SOUND_VOLUME = 0.75`) en `src/config/audio.js`.

## Criterio de selección

- **Figurita detectada** — pluck suave, sensación de proximidad sin alarmar.
- **Captura exitosa** — confirmación más larga y cálida; es el SFX principal del producto.
- **Nueva en álbum** — confirmación elegante, tono de desbloqueo/colección.
- **Llegada a destino** — ding corto tipo UI/navegación, claro pero breve.
- **Error / fuera de rango** — tono negativo mínimo; nunca agresivo.
- **Inicio navegación** — confirmación positiva al elegir destino (`Ir al punto` / `Rumbo a`).
- **Cancelar navegación** — cierre suave al salir del modo exploración o seguimiento.
- **GPS encontrado** — tick casi imperceptible; una vez por sesión al obtener primera señal usable.

Ninguno de los samples elegidos es arcade, infantil ni tipo videojuego retro.

## Reemplazar o agregar sonidos

1. Colocar el nuevo MP3 en `public/sounds/`.
2. Actualizar `SOUND_CATALOG` en `src/config/audio.js` (`src`, `volume`, descripción).
3. Añadir fila en esta tabla con fuente y licencia verificada.
4. Preferir licencias **CC0**, **Pixabay Content License** o **Mixkit License** para uso comercial.

## Notas técnicas

- Conversión: OGG → MP3 mono 96 kbps (optimizado para móvil).
- Precarga automática al boot vía `soundService.schedulePreload()` en `main.jsx`.
- Integración documentada en `docs/AUDIO_UX_AUDIT.md`.
