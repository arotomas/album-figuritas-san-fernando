import {
  DEFAULT_SOUND_VOLUME,
  SOUND_CATALOG,
} from '../../config/audio'

function createAudioElement(src) {
  const audio = new Audio(src)
  audio.preload = 'auto'
  audio.playsInline = true
  return audio
}

class SoundService {
  constructor() {
    /** @type {Map<string, HTMLAudioElement>} */
    this.instances = new Map()
    /** @type {Set<string>} */
    this.playing = new Set()
    this.volume = DEFAULT_SOUND_VOLUME
    this.muted = false
    this.preloaded = false
  }

  /** Precarga solo sonidos con `src` definido y `preload: true`. */
  preload() {
    if (this.preloaded || typeof window === 'undefined') return

    for (const entry of Object.values(SOUND_CATALOG)) {
      if (!entry?.src || entry.preload === false) continue
      this.ensureInstance(entry.id, entry.src)
    }

    this.preloaded = true
  }

  schedulePreload() {
    if (typeof window === 'undefined') return

    const run = () => {
      try {
        this.preload()
      } catch {
        // Precarga best-effort — no bloquea la app.
      }
    }

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(run, { timeout: 4000 })
      return
    }

    window.setTimeout(run, 1500)
  }

  ensureInstance(soundId, src) {
    const existing = this.instances.get(soundId)
    if (existing) return existing

    const audio = createAudioElement(src)
    audio.addEventListener('ended', () => {
      this.playing.delete(soundId)
    })
    audio.addEventListener('error', () => {
      this.playing.delete(soundId)
    })
    this.instances.set(soundId, audio)
    return audio
  }

  resolveEntry(soundId) {
    return SOUND_CATALOG[soundId] ?? null
  }

  masterVolume() {
    if (this.muted) return 0
    return Math.min(1, Math.max(0, this.volume))
  }

  playbackVolume(soundId) {
    const entry = this.resolveEntry(soundId)
    const gain =
      typeof entry?.volume === 'number' ? Math.min(1, Math.max(0, entry.volume)) : 1
    return this.masterVolume() * gain
  }

  /**
   * @param {string} soundId
   * @returns {boolean} true si se inició reproducción (o ya estaba en curso el mismo id)
   */
  play(soundId) {
    if (typeof window === 'undefined' || !soundId) return false
    if (this.playing.has(soundId)) return false

    const entry = this.resolveEntry(soundId)
    if (!entry?.src) return false

    const audio = this.ensureInstance(soundId, entry.src)
    audio.volume = this.playbackVolume(soundId)

    this.playing.add(soundId)

    const playPromise = audio.play()
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        this.playing.delete(soundId)
      })
    }

    return true
  }

  stop(soundId) {
    const audio = this.instances.get(soundId)
    if (!audio) return

    audio.pause()
    audio.currentTime = 0
    this.playing.delete(soundId)
  }

  stopAll() {
    for (const soundId of this.instances.keys()) {
      this.stop(soundId)
    }
    this.playing.clear()
  }

  mute() {
    this.muted = true
    for (const audio of this.instances.values()) {
      audio.volume = 0
    }
  }

  unmute() {
    this.muted = false
    for (const [soundId, audio] of this.instances.entries()) {
      audio.volume = this.playbackVolume(soundId)
    }
  }

  isMuted() {
    return this.muted
  }

  setVolume(value) {
    this.volume = Math.min(1, Math.max(0, Number(value) || 0))
    if (!this.muted) {
      for (const [soundId, audio] of this.instances.entries()) {
        audio.volume = this.playbackVolume(soundId)
      }
    }
  }

  getVolume() {
    return this.volume
  }
}

export const soundService = new SoundService()
