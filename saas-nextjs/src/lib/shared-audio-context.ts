'use client'

import { encodePcm16ToWav } from '@/lib/pcm-wav'

/**
 * Shared AudioContext for microphone capture, plus HTMLAudioElements for
 * speaker output. Do not route agent PCM through MediaStreamAudioDestinationNode:
 * that stream is silent on iOS Safari and some Android Chrome builds while the
 * mic is open.
 */

let sharedContext: AudioContext | null = null
let holdElement: HTMLAudioElement | null = null
let speechElement: HTMLAudioElement | null = null
let holdUrl: string | null = null
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

const createAttachedAudio = (): HTMLAudioElement => {
  const audio = document.createElement('audio')
  audio.setAttribute('playsinline', 'true')
  audio.setAttribute('webkit-playsinline', 'true')
  ;(audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true
  audio.autoplay = true
  audio.controls = false
  audio.preload = 'auto'
  audio.muted = false
  audio.volume = 1
  audio.style.position = 'fixed'
  audio.style.width = '1px'
  audio.style.height = '1px'
  audio.style.opacity = '0.01'
  audio.style.pointerEvents = 'none'
  audio.style.left = '0'
  audio.style.bottom = '0'
  audio.setAttribute('aria-hidden', 'true')
  document.body.appendChild(audio)
  return audio
}

const ensureHoldElement = (): HTMLAudioElement => {
  if (!holdElement) {
    holdElement = createAttachedAudio()
    holdElement.loop = true
  }
  return holdElement
}

export const getSpeechAudioElement = (): HTMLAudioElement => {
  if (!speechElement) {
    speechElement = createAttachedAudio()
    speechElement.loop = false
  }
  return speechElement
}

export const getSharedAudioContext = (): AudioContext => {
  if (!sharedContext || sharedContext.state === 'closed') {
    sharedContext = new (getAudioContextConstructor())()
  }
  return sharedContext
}

const startHoldTone = async (): Promise<void> => {
  const hold = ensureHoldElement()
  if (!holdUrl) {
    const wav = encodePcm16ToWav(new Int16Array(4800), 24000)
    holdUrl = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }))
  }
  if (hold.src !== holdUrl) {
    hold.src = holdUrl
  }
  hold.muted = false
  hold.volume = 0.01
  try {
    await hold.play()
  } catch {
    // Speech element play() is the critical unlock; hold is best-effort.
  }
}

/**
 * Must run in a user-gesture call stack (mic tap) before getUserMedia.
 */
export const unlockSharedAudioContext = async (): Promise<AudioContext> => {
  if (unlockInFlight) {
    return unlockInFlight
  }

  unlockInFlight = (async () => {
    const ctx = getSharedAudioContext()
    const speech = getSpeechAudioElement()

    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    await startHoldTone()

    try {
      speech.muted = false
      speech.volume = 1
      if (speech.paused && speech.src) {
        await speech.play()
      }
    } catch {
      // First real WAV chunk will call play() again.
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
  const speech = speechElement
  if (!speech) return
  try {
    speech.muted = false
    speech.volume = 1
    if (speech.paused && speech.src) {
      await speech.play()
    }
  } catch {
    // ignore
  }
  if (sharedContext?.state === 'suspended') {
    void sharedContext.resume()
  }
}

export const __resetSharedAudioContextForTests = (): void => {
  if (holdUrl) {
    try {
      URL.revokeObjectURL(holdUrl)
    } catch {
      // ignore
    }
  }
  holdUrl = null

  for (const el of [holdElement, speechElement]) {
    if (!el) continue
    try {
      el.pause()
      el.removeAttribute('src')
      el.srcObject = null
      el.remove()
    } catch {
      // ignore
    }
  }
  holdElement = null
  speechElement = null

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
