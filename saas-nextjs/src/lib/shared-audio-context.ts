'use client'

/**
 * Shared AudioContext + HTMLAudioElement sink for mic capture and agent playback.
 *
 * Routing PCM through a MediaStreamAudioDestinationNode into an HTMLAudioElement
 * is more reliable than AudioContext.destination alone while getUserMedia is active
 * (especially on mobile Chrome/Safari).
 */

let sharedContext: AudioContext | null = null
let mediaDestination: MediaStreamAudioDestinationNode | null = null
let playbackElement: HTMLAudioElement | null = null
let unlockInFlight: Promise<AudioContext> | null = null

const getAudioContextConstructor = (): typeof AudioContext => {
  const ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!ctor) {
    throw new Error('Web Audio API is not supported in this browser')
  }
  return ctor
}

const ensurePlaybackElement = (stream: MediaStream): HTMLAudioElement => {
  if (!playbackElement) {
    const audio = document.createElement('audio')
    audio.setAttribute('playsinline', 'true')
    audio.setAttribute('webkit-playsinline', 'true')
    audio.autoplay = true
    audio.controls = false
    audio.preload = 'auto'
    audio.muted = false
    audio.volume = 1
    // Keep the element in the DOM so mobile browsers keep the media session alive.
    audio.style.position = 'fixed'
    audio.style.width = '1px'
    audio.style.height = '1px'
    audio.style.opacity = '0'
    audio.style.pointerEvents = 'none'
    audio.style.left = '0'
    audio.style.bottom = '0'
    audio.setAttribute('aria-hidden', 'true')
    document.body.appendChild(audio)
    playbackElement = audio
  }

  if (playbackElement.srcObject !== stream) {
    playbackElement.srcObject = stream
  }

  return playbackElement
}

export const getSharedAudioContext = (): AudioContext => {
  if (!sharedContext || sharedContext.state === 'closed') {
    sharedContext = new (getAudioContextConstructor())()
    mediaDestination = null
  }
  return sharedContext
}

export const getPlaybackDestination = (
  ctx: AudioContext = getSharedAudioContext()
): MediaStreamAudioDestinationNode => {
  if (!mediaDestination || mediaDestination.context !== ctx) {
    mediaDestination = ctx.createMediaStreamDestination()
  }
  ensurePlaybackElement(mediaDestination.stream)
  return mediaDestination
}

const playSilentUnlockBuffer = (ctx: AudioContext): void => {
  try {
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
    const source = ctx.createBufferSource()
    const dest = getPlaybackDestination(ctx)
    source.buffer = buffer
    source.connect(dest)
    source.connect(ctx.destination)
    source.start(0)
  } catch {
    // Ignore unlock-buffer failures; resume()/audio.play() are the primary unlock paths.
  }
}

/**
 * Must be called from a user-gesture call stack (click/tap) before any await
 * that leaves that stack (e.g. getUserMedia). Safari will not unlock otherwise.
 */
export const unlockSharedAudioContext = async (): Promise<AudioContext> => {
  if (unlockInFlight) {
    return unlockInFlight
  }

  unlockInFlight = (async () => {
    const ctx = getSharedAudioContext()
    const dest = getPlaybackDestination(ctx)
    const audio = ensurePlaybackElement(dest.stream)

    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    playSilentUnlockBuffer(ctx)

    try {
      audio.muted = false
      audio.volume = 1
      await audio.play()
    } catch {
      // Some browsers reject play() until a later gesture; mic tap usually retries.
    }

    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    return ctx
  })()

  try {
    return await unlockInFlight
  } finally {
    unlockInFlight = null
  }
}

export const kickPlaybackElement = async (): Promise<void> => {
  const audio = playbackElement
  if (!audio) return
  try {
    audio.muted = false
    audio.volume = 1
    if (audio.paused) {
      await audio.play()
    }
  } catch {
    // ignore
  }
}

/** Test helper — not used at runtime. */
export const __resetSharedAudioContextForTests = (): void => {
  if (playbackElement) {
    try {
      playbackElement.pause()
      playbackElement.srcObject = null
      playbackElement.remove()
    } catch {
      // ignore
    }
  }
  playbackElement = null
  mediaDestination = null

  if (sharedContext && sharedContext.state !== 'closed') {
    try {
      void sharedContext.close()
    } catch {
      // ignore
    }
  }
  sharedContext = null
  unlockInFlight = null
}
