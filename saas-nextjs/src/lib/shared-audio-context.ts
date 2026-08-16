'use client'

/**
 * One shared AudioContext for mic capture + PCM playback.
 * Multiple contexts often leave speaker output silent on mobile Safari/Chrome
 * while getUserMedia / ScriptProcessor is active.
 */

let sharedContext: AudioContext | null = null
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

export const getSharedAudioContext = (): AudioContext => {
  if (!sharedContext || sharedContext.state === 'closed') {
    sharedContext = new (getAudioContextConstructor())()
  }
  return sharedContext
}

const playSilentUnlockBuffer = (ctx: AudioContext): void => {
  try {
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
  } catch {
    // Ignore unlock-buffer failures; resume() is the primary unlock path.
  }
}

/**
 * Must be called from a user-gesture call stack (click/tap) before any await
 * that leaves that stack (e.g. getUserMedia). Safari will not resume otherwise.
 */
export const unlockSharedAudioContext = async (): Promise<AudioContext> => {
  if (unlockInFlight) {
    return unlockInFlight
  }

  unlockInFlight = (async () => {
    const ctx = getSharedAudioContext()
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    playSilentUnlockBuffer(ctx)
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

/** Test helper — not used at runtime. */
export const __resetSharedAudioContextForTests = (): void => {
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
