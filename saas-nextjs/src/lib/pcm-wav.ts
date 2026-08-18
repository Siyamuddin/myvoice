const writeString = (view: DataView, offset: number, value: string): void => {
  for (let i = 0; i < value.length; i++) {
    view.setUint8(offset + i, value.charCodeAt(i))
  }
}

/**
 * Wrap little-endian PCM16 mono samples in a WAV container so HTMLAudioElement
 * can play them. Web Audio MediaStreams are silent on several mobile browsers
 * while getUserMedia is active.
 */
export const encodePcm16ToWav = (pcm: Int16Array, sampleRate: number): ArrayBuffer => {
  const dataSize = pcm.byteLength
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  new Uint8Array(buffer, 44).set(new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength))
  return buffer
}

export const pcmRms = (pcm: Int16Array): number => {
  if (pcm.length === 0) {
    return 0
  }
  let sum = 0
  for (let i = 0; i < pcm.length; i++) {
    const sample = pcm[i] / 32768
    sum += sample * sample
  }
  return Math.sqrt(sum / pcm.length)
}

export const decodeBase64Pcm16 = (base64: string): Int16Array => {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  const even = bytes.byteLength - (bytes.byteLength % 2)
  const aligned = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + even)
  return new Int16Array(aligned)
}
