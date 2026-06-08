# Biblioteca de sonidos — intención funcional

Fuente de verdad para **cuándo** y **por qué** usar cada SFX.  
Antes de agregar un archivo o un evento nuevo, revisar esta guía y reutilizar la biblioteca existente.

**Archivos en disco:** `public/sounds/` (nombres kebab-case).  
**Implementación técnica:** `src/config/audio.js` (`SOUND_CATALOG`, `GAME_SOUND_EVENTS`).  
**Integración:** `docs/AUDIO_UX_AUDIT.md`.

---

## Regla general

Cuando se creen nuevos eventos o mecánicas, **intentar reutilizar esta biblioteca antes de agregar nuevos sonidos**.

---

# Sonidos de interfaz (UI)

## Sonido de botón (`sonido-boton` → ver nota de archivos)

**Usar para:**

- Botones de la Splash Screen.
- Navegación inferior (Explorar, Mi Álbum, Perfil).
- Apertura de pantallas.
- Confirmaciones simples de UI.
- Botones secundarios.

**NO usar para:**

- Capturas.
- Recompensas.
- Figuritas.
- Eventos importantes del juego.

**Objetivo:** feedback corto de interfaz.

> **Nota de archivos:** el asset original es *Sonido de botón.mp3*. En disco se sirve como copia en `inicio-navegacion.mp3` (evento `INICIO_NAVEGACION`). Reservar este sonido solo para UI; no reutilizarlo en captura ni recompensa.

---

## Cerrar popup (`cerrar-popup.mp3`)

**Usar para:**

- Cerrar navegación.
- Tocar la cruz de un modal.
- Cerrar overlays.
- Cancelar acciones visuales.

**Objetivo:** feedback de cierre o dismiss.

**Evento implementado:** `CANCELAR_NAVEGACION` → `cancelar-navegacion.mp3` (copia de este asset).

---

# Sonidos de exploración

## GPS encontrado (`gps-encontrado.mp3`)

**Usar cuando:**

- La aplicación obtiene una ubicación GPS válida.

**Objetivo:** informar que el GPS ya está listo para usarse.

**Evento implementado:** `GPS_ENCONTRADO`.

---

## Llegada a destino (`llegada-destino.mp3`)

**Usar cuando:**

- El jugador llega al punto de navegación.

**Objetivo:** confirmar que alcanzó el destino marcado.

**Evento implementado:** `LLEGADA_A_DESTINO`.

---

## Figurita cercana — GPS (`figurita-detectada.mp3`)

**Usar cuando:**

- El jugador entra en el radio de proximidad de una figurita.

**Objetivo:** generar expectativa y avisar que hay una figurita cerca.

**Evento implementado:** `FIGURITA_DETECTADA`.

---

## Recompensa (`recompensa.mp3`)

**Usar cuando:**

- El jugador está dentro de la zona correcta.
- La cámara queda habilitada para capturar.

**Objetivo:** comunicar que ya puede fotografiar la figurita.

**Momento en el flujo:** este sonido ocurre **antes** de la captura.

**Evento implementado:** `CAMARA_HABILITADA` → `useCaptureFlow` (`isReady` + `vibrateReady`). El archivo debe existir en `public/sounds/recompensa.mp3`.

---

# Sonidos de captura

## Escaneo exitoso (`captura-exitosa.mp3`)

**Usar cuando:**

- La captura se valida correctamente.
- La foto fue aceptada.

**Objetivo:** celebrar una captura exitosa.

**Evento implementado:** `CAPTURA_EXITOSA`.

---

## Ganar puntos (`ganar-puntos.mp3`)

**Usar cuando:**

- Aparece el mensaje “Ganaste X puntos”.

**Objetivo:** recompensar visual y auditivamente la obtención de puntos.

**Momento en el flujo:** este sonido ocurre **después** de la captura.

**Estado:** evento **pendiente** (`GANAR_PUNTOS` o equivalente). Cablear en `FullScreenCaptureReward` / burst de puntos.

---

## Figurita nueva encontrada (`figurita-nueva-album.mp3`)

**Usar cuando:**

- Se agrega una figurita nueva al álbum.

**Objetivo:** celebrar el desbloqueo de una nueva figurita.

**Importancia:** uno de los sonidos más importantes del juego.

**Evento implementado:** `FIGURITA_NUEVA_EN_ALBUM`.

---

# Progresión y logros

## Nivel desbloqueado (`nivel-desbloqueado.mp3`)

**Usar cuando:**

- El jugador mejora su posición en el ranking.
- Entra al Top 10.
- Alcanza el puesto #1.
- Desbloquea un nuevo nivel o hito.

**Objetivo:** celebrar progreso personal.

**Estado:** funcionalidad **futura** (`NIVEL_DESBLOQUEADO`).

---

## Completar álbum (`completar-album.mp3`)

**Usar cuando:**

- El jugador completa el 100% de un álbum.

**Objetivo:** celebración máxima del juego.

**Importancia:** el sonido más importante de toda la aplicación.

**Estado:** funcionalidad **futura** (`COMPLETAR_ALBUM`).

---

# Notificaciones

## Notificación push (`notificacion-push.mp3`)

**Usar cuando:**

- Llega una notificación push mientras la app está abierta.

**Objetivo:** acompañar visualmente la recepción de la notificación.

**Estado:** evento **pendiente** (`NOTIFICACION_PUSH`).

---

# Errores

## Error (`error-fuera-rango.mp3` / fuente `error.mp3`)

**Usar cuando:**

- El jugador está fuera de rango.
- La captura falla.
- Ocurre un error funcional.

**Objetivo:** feedback negativo suave, sin resultar agresivo.

**Evento implementado:** `ERROR_O_FUERA_DE_RANGO`.

---

# Orden del flujo de captura (referencia)

Secuencia ideal según intención funcional:

```
FIGURITA_DETECTADA     → figurita-detectada.mp3   (proximidad)
        ↓
CAMARA_HABILITADA      → recompensa.mp3           (zona OK, cámara lista)  ✅
        ↓
[usuario dispara foto — sin SFX de botón]
        ↓
CAPTURA_EXITOSA        → captura-exitosa.mp3      (escaneo exitoso)
        ↓
GANAR_PUNTOS           → ganar-puntos.mp3         (mensaje de puntos)      [pendiente]
        ↓
FIGURITA_NUEVA_EN_ALBUM → figurita-nueva-album.mp3 (desbloqueo en álbum)
```

---

# Mapa implementación ↔ intención

| Evento (`GAME_SOUND_EVENTS`) | Archivo servido | Asset de intención | Estado |
|------------------------------|-----------------|-------------------|--------|
| `FIGURITA_DETECTADA` | `figurita-detectada.mp3` | Figurita cercana (GPS) | ✅ alineado |
| `GPS_ENCONTRADO` | `gps-encontrado.mp3` | GPS encontrado | ✅ alineado |
| `LLEGADA_A_DESTINO` | `llegada-destino.mp3` | Llegada a destino | ✅ alineado |
| `INICIO_NAVEGACION` | `inicio-navegacion.mp3` | Sonido de botón | ✅ alineado (confirmación UI) |
| `CANCELAR_NAVEGACION` | `cancelar-navegacion.mp3` | Cerrar popup | ✅ alineado |
| `CAPTURA_EXITOSA` | `captura-exitosa.mp3` | Escaneo exitoso | ✅ alineado |
| `FIGURITA_NUEVA_EN_ALBUM` | `figurita-nueva-album.mp3` | Figurita nueva encontrada | ✅ alineado |
| `ERROR_O_FUERA_DE_RANGO` | `error-fuera-rango.mp3` | Error | ✅ alineado |
| `CAMERA_SHUTTER` | `camera-shutter.mp3` | Sonido de botón | ⚠️ deuda: el spec prohíbe botón en capturas; falta asset de disparo o silenciar evento |
| `CAMARA_HABILITADA` | `recompensa.mp3` | Recompensa | ✅ cableado (requiere archivo en disco) |
| — | — | Ganar puntos | ⏳ pendiente |
| — | — | Nivel desbloqueado | 🔮 futuro |
| — | — | Completar álbum | 🔮 futuro |
| — | — | Notificación push | ⏳ pendiente |
| — | — | Sonido de botón (UI general) | ⏳ pendiente cablear en splash/tabs |

---

# Inventario en `public/sounds/`

| Archivo | Categoría | Uso previsto |
|---------|-----------|--------------|
| `figurita-detectada.mp3` | Exploración | Proximidad |
| `gps-encontrado.mp3` | Exploración | GPS listo |
| `llegada-destino.mp3` | Exploración | Llegada |
| `inicio-navegacion.mp3` | UI | Confirmación / botón |
| `cancelar-navegacion.mp3` | UI | Cerrar / dismiss |
| `cerrar-popup.mp3` | UI | Fuente de cierre |
| `cerrar-popup-2.mp3` | UI | Variante cierre (reserva) |
| `captura-exitosa.mp3` | Captura | Escaneo exitoso |
| `figurita-nueva-album.mp3` | Captura | Nueva figurita |
| `ganar-puntos.mp3` | Captura | Puntos post-captura |
| `error-fuera-rango.mp3` | Errores | Error funcional |
| `error.mp3` | Errores | Fuente de error |
| `completar-album.mp3` | Logros | 100% álbum |
| `nivel-desbloqueado.mp3` | Logros | Ranking / hitos |
| `notificacion-push.mp3` | Notificaciones | Push in-app |
| `camera-shutter.mp3` | — | Deuda técnica; no definido en spec |
| `recompensa.mp3` | Exploración | Zona lista — **restaurar en `public/sounds/`** si falta |

---

# Cómo agregar un evento nuevo

1. Buscar en esta guía si un sonido existente cubre el caso.
2. Si no existe, valorar si el momento UX encaja en un asset **pendiente** antes de grabar uno nuevo.
3. Añadir entrada en `SOUND_CATALOG` + `GAME_SOUND_EVENTS` en `src/config/audio.js`.
4. Llamar `playGameSound('EVENTO')` en el hook o componente correcto.
5. Actualizar la tabla **Mapa implementación ↔ intención** en este documento.
6. Registrar volumen relativo en `docs/AUDIO_ASSETS.md`.
