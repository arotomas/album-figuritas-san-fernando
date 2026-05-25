# Album Figuritas SF — Estabilidad v0.5

> Tag de referencia progresión: **`v0.5-progression`** (`0e6071c`)  
> Tag admin foundation: **`v0.6-admin-foundation`** (post-admin Fase 1)  
> Rollback progresión: `git checkout v0.5-progression`

---

## 1. Snapshot arquitectónico

### Stack
React 19 + Vite PWA · Zustand persist · Supabase auth/data · Leaflet · Framer Motion · Tailwind

### Capas

```
UI (pages/components)
  ↓
Hooks (capture, boot, geolocation, proximity)
  ↓
Store (useAppStore) ←→ localStorage via storageService
  ↓
Services (supabase sync, figures fetch, admin CRUD)
  ↓
Supabase (figures, user_figures, captures, profiles)
```

### Flujos críticos

| Flujo | Entrada | Core | Salida |
|-------|---------|------|--------|
| **Auth** | `useAuth` / `lib/supabase.js` | Session restore, profile gate | `useAppStore` auth fields |
| **Boot** | `useAppBootGate` + `AppBootScreen` | Hydrate → session → catalog pull | Routes desbloqueadas |
| **GPS / proximity** | `useGeolocation` → `useFigureProximity` | `config/proximity.js`, `useSmoothedProximity` | `nearFigure` en store |
| **Capture** | `CaptureFlow` + `useCaptureFlow` | Ring, photo, distance check | `obtainFigureWithPhotoSynced` |
| **Unlock** | Store action | `syncUnlockToSupabase` → Storage + `user_figures` | Reward/Unlock animations |
| **Álbum** | `MyFiguresScreen` | `figureGameRules` + `collectionModel` | Grid, dashboard, viewers |
| **Persistencia** | Zustand persist | `migrationService`, 4.5MB cap | Solo progreso por figurita |
| **PWA** | `vite-plugin-pwa`, icons | `ConnectionStatus`, SW | Offline shell |

### Dónde vive cada responsabilidad

| Dominio | Archivos sensibles |
|---------|-------------------|
| Auth / session | `src/hooks/useAuth.js`, `src/lib/supabase.js`, `src/utils/sessionDebug.js` |
| Boot gate | `src/hooks/useAppBootGate.js`, `src/components/AppBootScreen.jsx` |
| GPS / ring | `src/hooks/useCaptureFlow.js`, `src/hooks/useSmoothedProximity.js`, `src/config/proximity.js` |
| Unlock + sync | `src/store/useAppStore.js`, `src/services/supabase/sync.js` |
| Game rules | `src/utils/figureGameRules.js` |
| Colecciones UX | `src/config/albumCollections.js`, `src/utils/collectionModel.js` |
| Catálogo remoto | `src/services/supabase/figures.js`, `src/hooks/useSupabaseBootstrap.js` |
| Persist merge | `src/services/storage/migrationService.js` |
| Fullscreen / modals | `FigureCollectionViewer`, `CollectionDetailViewer`, `FigureDetailSheet` |
| Admin figures | `AdminFiguresPage`, `adminDashboard.js`, `adminShared.jsx` |
| Rarezas visuales | `src/theme/rarity.js`, `src/theme/collectionStatus.js` |

---

## 2. Lista NO TOCAR (sin auditoría previa)

1. **`useAppBootGate` / hydration** — gates que evitan flash y rutas rotas
2. **`useSmoothedProximity` + ring progress** — GPS suavizado y arco del anillo
3. **`useCaptureFlow` unlock sequencing** — orden: distancia → foto → store → sync
4. **`syncUnlockToSupabase`** — upload foto + upsert `user_figures` + insert `captures`
5. **`RewardAnimation` / `UnlockAnimation` timing** — secuencia post-capture
6. **`mergeFiguresWithTemplate` / `mergeCatalogWithProgress`** — rehydrate sin perder progreso
7. **`figureGameRules` caps** (`MAIN_ALBUM_NORMAL_TOTAL`, reveal slots) — afecta mapa y álbum
8. **`getPlayerMapFigures` + hidden bonus detection** — visibilidad mapa
9. **`buildPersistedSnapshot`** — qué se guarda en localStorage (fotos base64)
10. **`storageService.set` quota guard** — límite 4.5MB
11. **RLS / admin policies** en Supabase migrations 003–014
12. **`celebratedCollectionIds` detection** — timing de animación completado colección

---

## 3. Deuda técnica real (priorizada)

| # | Riesgo | Impacto | Notas |
|---|--------|---------|-------|
| P1 | **Fotos en localStorage** | Quota iOS ~5MB | Ver `storageAuditReport.js`; migrar a IndexedDB/Storage |
| P1 | **Colecciones solo client-side** | Admin no escala | `albumCollections.js` vs DB; Phase 2 admin colecciones |
| P1 | **Columnas figuritas duplicadas** | Columnas null silenciosas | Unificado en `figureSchema.js` (admin/player/adminPlayers) |
| P2 | **Rareza = track main/bonus** | Admin vs runtime divergen | Desacoplar `is_bonus` de rarity tiers |
| P2 | **`FIGURE_COLLECTION_OVERRIDES`** | Seed IDs `'1'..'5'` no matchean slugs | Backfill `collection_id` en Supabase |
| P2 | **`discoveredBonusIds` session-only** | Bonus re-ocultos post-refresh | Persistir discovery |
| P2 | **`capture_radius` DB ignorado** | Admin edita, gameplay no usa | Unificar con `proximity.js` o documentar |
| P3 | **Sin validación server unlock** | Cheat posible vía RLS | Validación edge function futura |
| P3 | **Mock template en rehydrate** | Figures remote-only offline | Bootstrap post-auth obligatorio |
| P3 | **Celebraciones solo local** | No sync multi-device | Tabla `user_collection_completions` |

---

## 4. Checklist manual pre-deploy

### Auth & sesión
- [ ] Login email/password persiste tras refresh
- [ ] Logout limpia store sin corrupt payload
- [ ] Profile incomplete redirige a setup

### Core gameplay
- [ ] Mapa carga markers y proximidad
- [ ] Anillo GPS responde al acercarse (no stale)
- [ ] Capture + foto desbloquea figurita
- [ ] Reward animation → álbum muestra figurita nueva
- [ ] Retake photo funciona

### Álbum & progresión
- [ ] Dashboard global muestra % correcto
- [ ] Colecciones agrupadas con progreso
- [ ] Tap colección → vista fullscreen
- [ ] Tap figurita obtenida → viewer fullscreen
- [ ] Completar colección → animación + no repite

### PWA & red
- [ ] Install prompt / iconos correctos
- [ ] `ConnectionStatus` visible offline
- [ ] Reconnect tras offline no pierde sesión

### Mobile
- [ ] iOS Safari: scroll álbum, safe areas, vibración
- [ ] Android Chrome: capture camera, GPS permission

### Admin (si deploy incluye cambios admin)
- [ ] CRUD figurita guarda en Supabase
- [ ] Map picker actualiza lat/lng
- [ ] Toggle active refleja en app tras bootstrap

---

## 5. Escalado futuro (admin universo)

| Etapa | DB | Cliente |
|-------|-----|---------|
| Fase 1 figures | `collection_id`, event cols en `figures` | Admin CRUD + dropdown colecciones |
| Fase 2 collections | Tabla `album_collections` + fetch remoto | `collectionRegistry.js` fallback a `albumCollections.js` |
| Fase 3 events | `album_events` + FK | `isCollectionAvailable` lee DB |
| Gameplay timed | — | Activar flags ya preparados en config |
