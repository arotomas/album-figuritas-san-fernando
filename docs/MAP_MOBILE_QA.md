# QA móvil — mapa Leaflet (rama `diagnostic/map-mobile-isolation`)

**NO mergear a `main` hasta tener culpable confirmado.**

## Preparación

1. Deploy o preview de la rama `diagnostic/map-mobile-isolation`.
2. Celular + Web Inspector remoto (Safari → Develop / Chrome → `chrome://inspect`).
3. Antes de cada corrida:

   ```js
   __mapDebug.clear()
   __mapDebugResetSession()
   location.reload()
   ```

4. Tras cada prueba (30–60 s de pinch/pan/drag):

   ```js
   copy(__mapDebug.sessionReport())
   __mapDebug.audit()
   ```

Pegar resultado en [`MAP_MOBILE_QA_RESULTS.md`](./MAP_MOBILE_QA_RESULTS.md).

---

## Paso 0 — Baseline `leaflet-pure`

```
/map?map_debug_log=1&map_debug=leaflet-pure
```

**Debe mostrar banner:** `rotation · bearing · gpu · transitions · auto_follow · viewport_sync · resize_observer · marker_animations`

### Qué queda OFF (con flags)

| Capa | Flag |
|------|------|
| MapResizeHandler / invalidateSize automático | `resize_observer` |
| `useViewport` updates + `viewport-update` | `viewport_sync` |
| MapFlyController GPS | `auto_follow` |
| useCinematicMapBearing | `bearing` |
| MapRotationController | `rotation` |
| gpu-layer contenedor | `gpu` |
| Transiciones marcadores figura | `transitions` |
| pulse/float figura | `marker_animations` |

### Qué sigue ON (residual — sin flag)

Ver `__mapDebug.audit().residual`:

- `divIcon` + React roots en figuritas
- `UserLocationDot` (transición 640ms propia)
- `preferCanvas`
- Botón recentrar (`flyTo` manual)
- Exploración (`flyToBounds`) solo si activaste “Ir al punto”
- Overlays UI, `PwaInstallBanner` → puede disparar `viewport-update` puntual

### Logs esperados en `leaflet-pure` (gesto 30 s)

| Log | ¿Esperado? |
|-----|------------|
| `[map-debug:invalidateSize]` | **NO** (salvo exploración/recenter manual) |
| `[map-debug:flyTo]` autoFollow | **NO** |
| `[map-debug:panTo]` autoFollow | **NO** |
| `[map-debug:viewport]` skipped | Sí (tras primer paint) |
| `[map-debug:viewport]` dispatched | Solo 0–1 al cargar |
| `[map-debug:bearing]` | **NO** |
| `[map-debug:rotation]` | **NO** |
| `[map-debug:gesture]` | Sí al tocar |

Si ves `invalidateSize` con `duringGesture: true` → **bug confirmado** aunque flags estén off.

### Checklist paso 0

- [ ] Mapa estable al cargar
- [ ] Pinch/zoom sin tiles vacíos
- [ ] Pan sin “desarme”
- [ ] Sin recentrado fantasma
- [ ] `sessionReport`: `invalidateSize: 0` durante gestos

**Si falla aquí → problema NO es capa cinemática → ir a [Auditoría layout](#si-leaflet-pure-falla-auditoría-layout).**

---

## Bisect — UNA capa por vez

Siempre partir de sesión limpia. Cada URL activa **solo** esa capa (resto en pure).

| Paso | URL `map_debug=` | Capa probada |
|------|------------------|--------------|
| A | `map_debug_log=1&map_debug=bisect_only_resize` | ResizeObserver |
| B | `bisect_only_viewport` | viewport sync |
| C | `bisect_only_auto_follow` | GPS auto-follow |
| D | `bisect_only_bearing` | bearing |
| E | `bisect_only_rotation` | rotation mapPane |
| F | `bisect_only_gpu` | gpu-layer |
| G | `bisect_only_transitions` | CSS transitions marcadores |
| H | `bisect_only_marker_animations` | pulse/float |

Por cada paso documentar:

1. ¿Reproduce síntoma? (sí/no/parcial)
2. Síntoma exacto (tiles vacíos / pins / salto cámara / etc.)
3. Fase: drag | pinch | zoom end | GPS tick | orientation
4. Contadores `sessionReport`
5. Primer log sospechoso con `duringGesture: true`

**Primera capa que rompa = culpable principal para fix quirúrgico.**

---

## Si `leaflet-pure` falla — Auditoría layout

Revisar sin flags extra:

| Área | Archivo / selector | Riesgo |
|------|-------------------|--------|
| Altura app | `--app-height`, `.h-app`, `.app-shell` | `index.css` |
| Overflow | `.app-shell`, `main`, `.map-container` | clip tiles |
| PWA | `html.standalone`, `PwaInstallBanner` | viewport |
| Transform padre | `.gpu-layer` en botón recentrar | compositing |
| Tiles | `TILE_URL` OSM, red, CORS | vacíos por red |
| Canvas | `preferCanvas` | bugs iOS Safari |

Consola:

```js
__mapDebug.audit()
getComputedStyle(document.documentElement).getPropertyValue('--app-height')
document.querySelector('.map-container')?.getBoundingClientRect()
```

---

## Arquitectura mínima mobile (objetivo post-QA)

1. Leaflet estático: sin `transform` en `mapPane`, sin `invalidateSize` en gesto.
2. Recentrar solo botón explícito.
3. Marcadores simples o `divIcon` sin animación CSS.
4. `useViewport` solo teclado/orientación, no cada frame.
5. Efectos cinemáticos → `desktop only` o eliminados.

---

## Hipótesis principal (pre-evidencia)

**`invalidateSize` + `viewport-update` durante pinch/pan** — ver contador y `duringGesture` en logs.

Combinación tóxica probable: **resize_observer + viewport_sync + rotation (+ auto_follow)**.
