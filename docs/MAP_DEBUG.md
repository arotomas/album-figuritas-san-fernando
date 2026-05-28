# Diagnóstico mapa móvil (rama `diagnostic/map-mobile-isolation`)

Aislamiento temporal — **no mergear a main** sin quitar flags.

## Activar en el celular

1. Abrí la app con query string (ej. deploy preview):

   ```
   /map?map_debug_log=1&map_debug=leaflet-pure
   ```

2. **Preset Leaflet puro** (apaga todas las capas sospechosas):

   ```
   ?map_debug=leaflet-pure&map_debug_log=1
   ```

3. **Una capa a la vez** (bisect):

   ```
   ?map_debug=disable_resize_observer&map_debug_log=1
   ```

4. Los flags persisten en `sessionStorage` hasta `__mapDebug.clear()` en consola.

## Flags

| Token URL | Flag |
|-----------|------|
| `disable_rotation` | Rotación CSS del `mapPane` |
| `disable_bearing` | Hook bearing / marcadores counter-rotate |
| `disable_gpu` | Clase `gpu-layer` en contenedor |
| `disable_transitions` | Transiciones CSS en marcadores |
| `disable_auto_follow` | `MapFlyController` (flyTo/panTo GPS) |
| `disable_viewport_sync` | `useViewport` / `--app-height` |
| `disable_resize_observer` | `MapResizeHandler` + `invalidateSize` |
| `disable_marker_animations` | pulse/float en `FigureMarker` |

## Consola (Safari Web Inspector / Chrome remote)

```js
__mapDebug.active()
__mapDebug.enable('MAP_DEBUG_DISABLE_RESIZE_OBSERVER')
__mapDebug.presetLeafletPure()
__mapDebug.clear()
```

Filtrar logs: `[map-debug`

## Orden sugerido de prueba

1. `leaflet-pure` — si mejora → reactivar de a una hasta reproducir el bug.
2. Solo `disable_resize_observer`
3. Solo `disable_viewport_sync`
4. Solo `disable_auto_follow`
5. Solo `disable_rotation` + `disable_bearing`
