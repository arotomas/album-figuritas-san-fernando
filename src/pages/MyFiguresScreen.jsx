import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { m } from 'framer-motion'
import { useAppStore, ALBUM_STATUS } from '../store/useAppStore'
import { AlbumBackground } from '../components/album/AlbumBackground'
import { AlbumScreenSkeleton } from '../components/album/AlbumFigureSkeleton'
import { LockedFigureCard } from '../components/album/LockedFigureCard'
import { NewBadge } from '../components/album/NewBadge'
import { FigureDetailSheet } from '../components/album/FigureDetailSheet'
import { FigureCollectionViewer } from '../components/album/FigureCollectionViewer'
import { CollectionSectionHeader } from '../components/album/CollectionSectionHeader'
import { AlbumGlobalDashboard } from '../components/album/AlbumGlobalDashboard'
import { CollectionCompleteAnimation } from '../components/album/CollectionCompleteAnimation'
import { CollectionDiscoverAnimation } from '../components/album/CollectionDiscoverAnimation'
import { CollectionDetailViewer } from '../components/album/CollectionDetailViewer'
import { RarityBadge } from '../components/ui/RarityBadge'
import { useQaMode } from '../utils/qaMode'
import { getRarity } from '../theme/rarity'
import { vibrateAlbumSwipe } from '../utils/vibration'
import {
  myFiguresLog,
  sanitizeAlbumFigures,
} from '../utils/myFiguresLog'
import {
  getMainProgressState,
  getRevealedNormalFigures,
} from '../utils/figureGameRules'
import {
  enrichFigureWithCollection,
  getAlbumGlobalProgress,
  getBonusCollectionGroups,
  getLiveEventCollectionGroups,
  getArchivedEventCollectionGroups,
  getMainAlbumCollectionGroups,
  detectCollectionCompletionTransition,
  detectCollectionDiscoveryTransition,
} from '../utils/collectionModel'
import { useAlbumCollectionsBootstrap } from '../hooks/useAlbumCollectionsBootstrap'
import { useCollectionAvailabilityOptions } from '../hooks/useCollectionAvailability'
import { logAlbumAvailabilitySnapshot } from '../utils/universeDiagnostics'
import { getMapProximityHint } from '../utils/proximityExperience'

const STATUS_LABELS = {
  [ALBUM_STATUS.EN_PROGRESO]: 'En progreso',
  [ALBUM_STATUS.COMPLETADO]: 'Completado',
  [ALBUM_STATUS.EN_REVISION]: 'En revisión',
}

function AlbumStickyBar({ mainProgress, albumStatus, missionLine }) {
  const ratio =
    mainProgress.visibleTotal > 0 ? mainProgress.obtained / mainProgress.visibleTotal : 0

  return (
    <div className="album-sticky-bar safe-x shrink-0 px-4 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-bold tabular-nums text-ink">
          {mainProgress.obtained}
          <span className="font-normal text-muted"> / {mainProgress.total}</span>
        </p>
        <span className="shrink-0 rounded-full bg-black/[0.04] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted">
          {STATUS_LABELS[albumStatus] ?? albumStatus}
        </span>
      </div>

      <div
        className="mt-1.5 h-1 overflow-hidden rounded-full bg-border/55"
        role="progressbar"
        aria-valuenow={mainProgress.obtained}
        aria-valuemin={0}
        aria-valuemax={mainProgress.visibleTotal}
        aria-label={`${mainProgress.obtained} de ${mainProgress.total} figuritas descubiertas`}
      >
        <div
          className="album-progress-fill h-full rounded-full bg-progress transition-[width] duration-500 ease-out"
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
      </div>

      {missionLine && (
        <p className="mt-1.5 truncate font-body text-[11px] leading-snug text-muted">
          {missionLine}
        </p>
      )}
    </div>
  )
}

function AlbumSlotCard({ figure, isNew, onSelect }) {
  const rarity = getRarity(figure.rareza)
  const obtained = Boolean(figure.obtenida)
  const isBonus = Boolean(figure.is_bonus)
  const photo = figure.foto

  return (
    <m.button
      type="button"
      layout={false}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(figure.id)}
      className={`album-slot-card ${obtained ? 'album-slot-obtained' : 'album-slot-locked'} ${
        isBonus ? 'album-slot-bonus' : ''
      } relative overflow-hidden rounded-[1.35rem] border-2 text-left ${rarity.tailwind.border}`}
      style={{
        boxShadow: obtained
          ? `0 12px 28px rgba(17,17,19,0.14), ${rarity.cssGlow}`
          : undefined,
      }}
    >
      <div className={`h-1 w-full ${rarity.tailwind.accent}`} />

      {obtained ? (
        <>
          <div className={`relative bg-gradient-to-b ${rarity.tailwind.gradient}`}>
            <div className="absolute left-2 top-2 z-20">
              <RarityBadge rareza={figure.rareza} size="sm" />
            </div>
            {isNew && (
              <span className="absolute right-2 top-2 z-20">
                <NewBadge />
              </span>
            )}
            <div className="relative aspect-[3/4] p-2.5">
              <div className={`h-full overflow-hidden rounded-2xl border ${rarity.tailwind.border} bg-black/25 p-1`}>
                {photo ? (
                  <img
                    src={photo}
                    alt={figure.nombre}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full rounded-xl object-cover"
                    onError={(event) => {
                      myFiguresLog.warn('missing photo fallback', {
                        figureId: figure.id,
                        reason: 'grid-image-load-error',
                        src: photo,
                      })
                      event.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl bg-charcoal text-4xl">
                    {figure.emoji}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white/95 px-3 pb-3 pt-2">
            <p className="line-clamp-2 min-h-[2rem] font-display text-sm font-black leading-tight text-ink">
              {figure.nombre}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted">
              Descubierta
            </p>
          </div>
        </>
      ) : (
        <>
          <LockedFigureCard figure={figure} variant="thumb" className="rounded-none" />
          <div className="bg-charcoal px-3 pb-3 pt-2">
            <p className="font-display text-sm font-black text-white/75">????</p>
            <p className="mt-1 text-[10px] leading-4 text-white/45">
              {isBonus
                ? 'Se revela cuando algo especial esté cerca.'
                : 'Se revela al completar más figuritas.'}
            </p>
            <div className="mt-2 opacity-75">
              <RarityBadge rareza={figure.rareza} size="sm" />
            </div>
          </div>
        </>
      )}
    </m.button>
  )
}

export function MyFiguresScreen() {
  useAlbumCollectionsBootstrap(true)
  const navigate = useNavigate()
  const { withQa } = useQaMode()
  const rawFigures = useAppStore((state) => state.figures)
  const albumStatus = useAppStore((state) => state.albumStatus)
  const lastObtenidaFigureId = useAppStore((state) => state.lastObtenidaFigureId)
  const setLastViewedFigure = useAppStore((state) => state.setLastViewedFigure)
  const startRetakeSession = useAppStore((state) => state.startRetakeSession)
  const deleteFigurePhotoSynced = useAppStore((state) => state.deleteFigurePhotoSynced)
  const nearFigure = useAppStore((state) => state.nearFigure)
  const hasHydrated = useAppStore((state) => state._hasHydrated)
  const celebratedCollectionIds = useAppStore((state) => state.celebratedCollectionIds)
  const discoveredCollectionIds = useAppStore((state) => state.discoveredCollectionIds)
  const acknowledgedDiscoveryCollectionIds = useAppStore(
    (state) => state.acknowledgedDiscoveryCollectionIds,
  )
  const acknowledgeCollectionCelebration = useAppStore(
    (state) => state.acknowledgeCollectionCelebration,
  )
  const acknowledgeCollectionDiscovery = useAppStore(
    (state) => state.acknowledgeCollectionDiscovery,
  )
  const availabilityOptions = useCollectionAvailabilityOptions()
  const [viewerFigureId, setViewerFigureId] = useState(null)
  const [sheetFigureId, setSheetFigureId] = useState(null)
  const [openCollectionId, setOpenCollectionId] = useState(null)
  const [celebratingProgress, setCelebratingProgress] = useState(null)
  const [discoveringCollection, setDiscoveringCollection] = useState(null)
  const celebrationCheckedForRef = useRef(null)
  const discoveryCheckedForRef = useRef(null)

  const sanitizedFigures = useMemo(() => sanitizeAlbumFigures(rawFigures), [rawFigures])
  const mainProgress = useMemo(() => getMainProgressState(sanitizedFigures), [sanitizedFigures])
  const mainFigures = useMemo(() => getRevealedNormalFigures(sanitizedFigures), [sanitizedFigures])
  const mainCollectionGroups = useMemo(
    () => getMainAlbumCollectionGroups(sanitizedFigures, availabilityOptions),
    [sanitizedFigures, availabilityOptions],
  )
  const bonusCollectionGroups = useMemo(
    () => getBonusCollectionGroups(sanitizedFigures, availabilityOptions),
    [sanitizedFigures, availabilityOptions],
  )
  const liveEventCollectionGroups = useMemo(
    () => getLiveEventCollectionGroups(sanitizedFigures, availabilityOptions),
    [sanitizedFigures, availabilityOptions],
  )
  const archivedEventCollectionGroups = useMemo(
    () => getArchivedEventCollectionGroups(sanitizedFigures, availabilityOptions),
    [sanitizedFigures, availabilityOptions],
  )
  const globalProgress = useMemo(
    () => getAlbumGlobalProgress(sanitizedFigures, availabilityOptions),
    [sanitizedFigures, availabilityOptions],
  )

  useEffect(() => {
    logAlbumAvailabilitySnapshot(sanitizedFigures, availabilityOptions)
  }, [sanitizedFigures, availabilityOptions])

  const openCollectionGroup = useMemo(() => {
    const groups = [
      ...mainCollectionGroups,
      ...bonusCollectionGroups,
      ...liveEventCollectionGroups,
      ...archivedEventCollectionGroups,
    ]
    return groups.find((group) => group.collection.id === openCollectionId) ?? null
  }, [
    mainCollectionGroups,
    bonusCollectionGroups,
    liveEventCollectionGroups,
    archivedEventCollectionGroups,
    openCollectionId,
  ])
  const bonusFiguresTotal = useMemo(
    () => bonusCollectionGroups.reduce((sum, group) => sum + group.figures.length, 0),
    [bonusCollectionGroups],
  )
  const obtainedBonusCount = useMemo(
    () =>
      bonusCollectionGroups.reduce(
        (sum, group) => sum + group.figures.filter((figure) => figure.obtenida).length,
        0,
      ),
    [bonusCollectionGroups],
  )
  const nextMissionFigure = mainFigures.find((figure) => !figure.obtenida) ?? null
  const lastObtainedFigure = sanitizedFigures.find(
    (figure) => figure.id === lastObtenidaFigureId,
  )
  const featuredRarity = nearFigure?.rareza ?? lastObtainedFigure?.rareza ?? nextMissionFigure?.rareza

  const missionLine = useMemo(() => {
    if (nearFigure) {
      const hint =
        getMapProximityHint(nearFigure.proximity?.phase ?? 'medium', {
          isBonus: nearFigure.is_bonus,
        }) ?? 'Hay algo cerca… seguí explorando.'
      return nearFigure.nombre ? `${hint} · ${nearFigure.nombre}` : hint
    }
    if (nextMissionFigure) {
      return `Próxima figurita: ${nextMissionFigure.nombre}`
    }
    return 'Explorá el mapa para descubrir secretos especiales.'
  }, [nearFigure, nextMissionFigure])

  const obtainedFigures = useMemo(() => {
    const main = mainFigures.filter((figure) => figure.obtenida)
    const bonus = bonusCollectionGroups.flatMap((group) =>
      group.figures.filter((figure) => figure.obtenida),
    )
    const eventFigures = [...liveEventCollectionGroups, ...archivedEventCollectionGroups].flatMap(
      (group) => group.figures.filter((figure) => figure.obtenida),
    )
    return [...main, ...bonus, ...eventFigures].map(enrichFigureWithCollection)
  }, [mainFigures, bonusCollectionGroups, liveEventCollectionGroups, archivedEventCollectionGroups])

  const sheetFigure = useMemo(
    () =>
      sheetFigureId
        ? sanitizedFigures.find((figure) => String(figure.id) === String(sheetFigureId))
        : null,
    [sanitizedFigures, sheetFigureId],
  )

  const handleSelect = useCallback(
    (figureId) => {
      const selected = sanitizedFigures.find((figure) => String(figure.id) === String(figureId))
      if (!selected) {
        myFiguresLog.warn('render guard — select ignored for missing figure', { figureId })
        return
      }

      vibrateAlbumSwipe()
      setLastViewedFigure(figureId)

      if (selected.obtenida) {
        setViewerFigureId(figureId)
        setSheetFigureId(null)
        return
      }

      setSheetFigureId(figureId)
      setViewerFigureId(null)
    },
    [sanitizedFigures, setLastViewedFigure],
  )

  const handleRetakePhoto = useCallback(
    (figure) => {
      if (!figure?.obtenida) return
      setViewerFigureId(null)
      setSheetFigureId(null)
      startRetakeSession(figure)
      navigate(withQa('/capture'))
    },
    [navigate, startRetakeSession, withQa],
  )

  const handleDeletePhoto = useCallback(
    async (figure) => {
      if (!figure?.obtenida || !figure?.foto) return
      const ok = await deleteFigurePhotoSynced(figure.id)
      if (ok) {
        setViewerFigureId(null)
        setSheetFigureId(null)
      }
    },
    [deleteFigurePhotoSynced],
  )

  useEffect(() => {
    if (!hasHydrated || !lastObtenidaFigureId) return

    const checkKey = String(lastObtenidaFigureId)
    if (celebrationCheckedForRef.current === checkKey) return
    celebrationCheckedForRef.current = checkKey

    const transition = detectCollectionCompletionTransition(
      sanitizedFigures,
      lastObtenidaFigureId,
    )
    if (!transition) return
    if (celebratedCollectionIds?.includes(transition.collectionId)) return

    setCelebratingProgress(transition)
  }, [hasHydrated, lastObtenidaFigureId, sanitizedFigures, celebratedCollectionIds])

  useEffect(() => {
    if (!hasHydrated || !lastObtenidaFigureId) return

    const checkKey = String(lastObtenidaFigureId)
    if (discoveryCheckedForRef.current === checkKey) return
    discoveryCheckedForRef.current = checkKey

    const transition = detectCollectionDiscoveryTransition(
      sanitizedFigures,
      lastObtenidaFigureId,
      discoveredCollectionIds,
    )
    if (!transition) return
    if (acknowledgedDiscoveryCollectionIds?.includes(transition.collectionId)) return

    setDiscoveringCollection(transition.collection)
  }, [
    hasHydrated,
    lastObtenidaFigureId,
    sanitizedFigures,
    discoveredCollectionIds,
    acknowledgedDiscoveryCollectionIds,
  ])

  const handleCollectionCelebrationComplete = useCallback(() => {
    if (celebratingProgress?.collectionId) {
      acknowledgeCollectionCelebration(celebratingProgress.collectionId)
    }
    setCelebratingProgress(null)
  }, [acknowledgeCollectionCelebration, celebratingProgress])

  const handleCollectionDiscoveryComplete = useCallback(() => {
    if (discoveringCollection?.id) {
      acknowledgeCollectionDiscovery(discoveringCollection.id)
    }
    setDiscoveringCollection(null)
  }, [acknowledgeCollectionDiscovery, discoveringCollection])

  const handleOpenCollection = useCallback((collectionId) => {
    vibrateAlbumSwipe()
    setOpenCollectionId(collectionId)
  }, [])

  const handleCloseCollection = useCallback(() => {
    setOpenCollectionId(null)
  }, [])

  useEffect(() => {
    const activeFigure = sanitizedFigures.find((figure) => figure.id === lastObtenidaFigureId)
    if (!activeFigure) return
    myFiguresLog.info('active photo source', {
      figureId: activeFigure.id,
      hasPhotoUrl: Boolean(activeFigure.foto?.startsWith('http')),
      photoUrl: activeFigure.foto?.startsWith('http') ? activeFigure.foto : null,
      hasLocalPhoto: Boolean(activeFigure.foto?.startsWith('data:')),
      imageUrl: activeFigure.foto ?? null,
    })
  }, [lastObtenidaFigureId, sanitizedFigures])

  if (!hasHydrated || sanitizedFigures.length === 0) {
    return <AlbumScreenSkeleton />
  }

  return (
    <div className="my-figures-screen relative flex h-full min-h-0 flex-col overflow-hidden">
      <AlbumBackground rareza={featuredRarity ?? 'común'} />

      <AlbumStickyBar
        mainProgress={mainProgress}
        albumStatus={albumStatus}
        missionLine={missionLine}
      />

      <div className="my-figures-scroll safe-x relative z-10 min-h-0 flex-1 scroll-y-app px-4 pt-3">
        <div className="album-page-shell mx-auto mb-3 w-full max-w-[720px] px-1 sm:px-2">
          <AlbumGlobalDashboard globalProgress={globalProgress} />
        </div>

        <section className="album-page-shell mx-auto w-full max-w-[720px] rounded-[2rem] px-3 py-2 sm:px-5">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink/80">
              Álbum principal
            </h2>
            <span className="rounded-full bg-progress/15 px-2.5 py-0.5 text-[10px] font-black tabular-nums text-ink">
              {mainProgress.obtained}/{mainProgress.total}
            </span>
          </div>

          <div className="space-y-5">
            {mainCollectionGroups.map(({ collection, figures, progress }) => (
              <m.section
                key={collection.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="album-collection-section"
              >
                <CollectionSectionHeader
                  progress={progress}
                  onOpen={() => handleOpenCollection(collection.id)}
                />
                <div className="album-slot-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {figures.map((figure) => (
                    <AlbumSlotCard
                      key={figure.id}
                      figure={figure}
                      isNew={figure.obtenida && figure.id === lastObtenidaFigureId}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              </m.section>
            ))}
          </div>
        </section>

        {liveEventCollectionGroups.length > 0 && (
          <section className="album-page-shell album-event-page mx-auto mt-3 w-full max-w-[720px] rounded-[2rem] px-3 py-2 sm:px-5">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-sky-100/90">
                Eventos
              </h2>
            </div>
            <div className="space-y-5">
              {liveEventCollectionGroups.map(
                ({ collection, figures, progress, countdownLabel, event }) => (
                  <m.section
                    key={collection.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="album-collection-section"
                  >
                    <CollectionSectionHeader
                      progress={progress}
                      variant="event"
                      countdownLabel={countdownLabel}
                      eventBadge={event?.badge}
                      onOpen={() => handleOpenCollection(collection.id)}
                    />
                    <div className="album-slot-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {figures.map((figure) => (
                        <AlbumSlotCard
                          key={figure.id}
                          figure={figure}
                          isNew={figure.obtenida && figure.id === lastObtenidaFigureId}
                          onSelect={handleSelect}
                        />
                      ))}
                    </div>
                  </m.section>
                ),
              )}
            </div>
          </section>
        )}

        {archivedEventCollectionGroups.length > 0 && (
          <section className="album-page-shell mx-auto mt-3 w-full max-w-[720px] rounded-[2rem] px-3 py-2 sm:px-5">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-white/40">
                Eventos pasados
              </h2>
            </div>
            <div className="space-y-5">
              {archivedEventCollectionGroups.map(
                ({ collection, figures, progress, countdownLabel, event }) => (
                  <m.section
                    key={collection.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="album-collection-section"
                  >
                    <CollectionSectionHeader
                      progress={progress}
                      variant="event"
                      archived
                      countdownLabel={countdownLabel}
                      eventBadge={event?.badge}
                      onOpen={() => handleOpenCollection(collection.id)}
                    />
                    <div className="album-slot-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {figures.map((figure) => (
                        <AlbumSlotCard
                          key={figure.id}
                          figure={figure}
                          isNew={figure.obtenida && figure.id === lastObtenidaFigureId}
                          onSelect={handleSelect}
                        />
                      ))}
                    </div>
                  </m.section>
                ),
              )}
            </div>
          </section>
        )}

        <section className="album-page-shell album-secret-page mx-auto mt-3 w-full max-w-[720px] rounded-[2rem] px-3 py-2 sm:px-5">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-amber-50/90">
              Bonus
            </h2>
            {bonusFiguresTotal > 0 && (
              <span className="rounded-full bg-amber-300/15 px-2.5 py-0.5 text-[10px] font-black tabular-nums text-amber-100">
                {obtainedBonusCount}/{bonusFiguresTotal}
              </span>
            )}
          </div>

          {bonusCollectionGroups.length > 0 ? (
            <div className="space-y-5">
              {bonusCollectionGroups.map(({ collection, figures, progress }) => (
                <m.section
                  key={collection.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="album-collection-section"
                >
                  <CollectionSectionHeader
                    progress={progress}
                    variant="bonus"
                    onOpen={() => handleOpenCollection(collection.id)}
                  />
                  <div className="album-slot-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {figures.map((figure) => (
                      <AlbumSlotCard
                        key={figure.id}
                        figure={figure}
                        isNew={figure.obtenida && figure.id === lastObtenidaFigureId}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                </m.section>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-amber-200/20 bg-charcoal/82 p-5 text-center shadow-inner">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-amber-200/20 bg-amber-300/10 text-3xl text-amber-100/70">
                ✦
              </div>
              <h3 className="mt-4 font-display text-base text-amber-50">
                Secretos escondidos en San Fernando
              </h3>
              <p className="mt-2 font-body text-sm leading-6 text-white/55">
                Algunas figuritas épicas y legendarias solo aparecen cuando explorás lugares especiales.
              </p>
            </div>
          )}
        </section>
      </div>

      <CollectionDetailViewer
        group={openCollectionGroup}
        open={Boolean(openCollectionGroup)}
        onClose={handleCloseCollection}
        onSelectFigure={(figureId) => {
          handleCloseCollection()
          handleSelect(figureId)
        }}
        lastObtenidaFigureId={lastObtenidaFigureId}
      />

      <CollectionCompleteAnimation
        progress={celebratingProgress}
        open={Boolean(celebratingProgress)}
        onComplete={handleCollectionCelebrationComplete}
      />

      <CollectionDiscoverAnimation
        collection={discoveringCollection}
        open={Boolean(discoveringCollection)}
        onComplete={handleCollectionDiscoveryComplete}
      />

      <FigureCollectionViewer
        figures={obtainedFigures}
        activeFigureId={viewerFigureId}
        open={Boolean(viewerFigureId)}
        onClose={() => setViewerFigureId(null)}
        onRetakePhoto={handleRetakePhoto}
        onDeletePhoto={handleDeletePhoto}
        getCollectionLabel={(figure) =>
          figure?.collection?.label ??
          (figure?.is_bonus ? 'Colección bonus' : 'Colección principal')
        }
      />

      <FigureDetailSheet
        figure={sheetFigure}
        open={Boolean(sheetFigure)}
        onClose={() => setSheetFigureId(null)}
        onRetakePhoto={handleRetakePhoto}
        onDeletePhoto={handleDeletePhoto}
      />
    </div>
  )
}
