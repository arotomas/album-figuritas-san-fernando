# Auditoría movimientos de cámara (Leaflet)

Rama: `diagnostic/map-mobile-isolation`

## Call sites en app jugador (`/map`)

| Origen | Método | Archivo | ¿Respeta `leaflet-pure` AUTO_FOLLOW? |
|--------|--------|---------|--------------------------------------|
| GPS auto-follow (1er fix / misión) | `flyTo` / `panTo` | `LeafletMapView.jsx` → `MapFlyController` | **Sí** — no monta si flag ON |
| Botón recentrar | `flyTo` | `LeafletMapView.jsx` → `handleRecenter` | No (acción manual) |
| Confirmar misión | `fitBounds` | `LeafletMapView.jsx` → `handleConfirmTarget` | No (acción manual) |
| Modo exploración | `flyToBounds` / `flyTo` | `explorationMap.js` → `ExplorationController` | **Parcial** — gate añadido con AUTO_FOLLOW |
| Admin | `setView` | `AdminFigureLocationPicker.jsx` | N/A (no `/map`) |

## Mecanismos de “follow” / recentrado

| Mecanismo | Archivo | Delay típico | `leaflet-pure` |
|-----------|---------|--------------|----------------|
| `MapFlyController` | `LeafletMapView.jsx` | GPS ~850ms + 1er fix | OFF |
| `scheduleResume` misión | `MapInteractionBridge.jsx` | **4500ms** (`MISSION_FOLLOW_RESUME_MS`) | No mueve mapa solo; despausa follow |
| `runExplorationCamera` | `ExplorationController.jsx` | Al activar exploración + GPS | Gate AUTO_FOLLOW |
| `useThrottledMapCenter` | `useThrottledMapCenter.js` | 850ms | Solo alimenta MapFlyController |
| `invalidateSize` | `MapResizeHandler` | Tras layout/gesto | OFF con `resize_observer` |

## Hipótesis recentrado tras ~4–5 s (tu síntoma)

1. **`MISSION_FOLLOW_RESUME_MS` = 4500** + misión activa + `MapFlyController` montado (pure no activo de verdad).
2. **Primer fix GPS tardío** → `isFirst` + `flyTo` en `MapFlyController`.
3. **Exploración activa** + `flyToBounds` (no iba en `MapDebugInstrument` antes de parchear `flyToBounds`).
4. **`invalidateSize`** tras gesto — puede parecer “vuelve al centro” sin ser `flyTo`.

## Verificación en celular

```js
// ¿MapFlyController montado?
// Si ves esto tras cargar /map con leaflet-pure, el preset NO está activo:
// [CAMERA_MOVE] { origen: 'MapFlyController MOUNTED', ... }

// Tras pan + esperar 5s:
copy(__mapDebug.sessionReport())
```

Filtrar consola: `[CAMERA_MOVE]`
