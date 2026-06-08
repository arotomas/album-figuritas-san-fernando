import { MUSIC_ENABLED } from '../../config/audio'
import { useAppStore } from '../../store/useAppStore'
import { OptionsSectionCard } from './OptionsSectionCard'

export function OptionsSoundSection() {
  const soundsEnabled = useAppStore((state) => state.soundsEnabled)
  const musicEnabled = useAppStore((state) => state.musicEnabled)
  const setSoundsEnabled = useAppStore((state) => state.setSoundsEnabled)
  const setMusicEnabled = useAppStore((state) => state.setMusicEnabled)

  return (
    <OptionsSectionCard title="Sonido" description="Ajustá la experiencia de juego.">
      <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-ink">
        <span>Efectos de sonido</span>
        <input
          type="checkbox"
          checked={soundsEnabled !== false}
          onChange={(event) => setSoundsEnabled(event.target.checked)}
          className="h-5 w-5 accent-progress"
        />
      </label>
      <label
        className={`mt-3 flex items-center justify-between gap-3 text-sm font-medium ${
          MUSIC_ENABLED ? 'cursor-pointer text-ink' : 'cursor-not-allowed text-muted'
        }`}
      >
        <span>Música ambiental</span>
        <input
          type="checkbox"
          checked={musicEnabled === true}
          disabled={!MUSIC_ENABLED}
          onChange={(event) => setMusicEnabled(event.target.checked)}
          className="h-5 w-5 accent-progress disabled:opacity-40"
        />
      </label>
      {!MUSIC_ENABLED ? <p className="mt-2 text-xs text-muted">Próximamente.</p> : null}
    </OptionsSectionCard>
  )
}
