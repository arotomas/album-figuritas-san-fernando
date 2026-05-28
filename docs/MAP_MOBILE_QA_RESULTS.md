# Resultados QA móvil — mapa

Rama: `diagnostic/map-mobile-isolation`  
Tester:  
Fecha:  
Dispositivo:  
OS:  
Navegador / PWA:  

---

## Paso 0 — `leaflet-pure`

URL: `/map?map_debug_log=1&map_debug=leaflet-pure`

| Pregunta | Resultado |
|----------|-----------|
| Mapa estable al cargar | |
| Tiles vacíos / incompletos | |
| Pinch/pan estable | |
| Recentrado fantasma | |
| `invalidateSize` durante gesto | |
| `flyTo`/`panTo` autoFollow en gesto | |

`sessionReport` (pegar):

```
```

Notas:

---

## Bisect

### A — resize observer only

| Campo | Valor |
|-------|-------|
| Rompe | sí / no |
| Síntoma | |
| Fase (drag/pinch/zoom end/GPS) | |
| invalidateSize durante gesto | |

### B — viewport sync only

(misma tabla)

### C — auto-follow only

### D — bearing only

### E — rotation only

### F — gpu layer only

### G — transitions only

### H — marker animations only

---

## Conclusión

**Primera feature que rompió:**  

**Evidencia (log línea / contador):**  

**Fix quirúrgico propuesto (1 párrafo, sin implementar aún):**  
