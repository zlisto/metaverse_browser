// The teleport whoosh, synthesized with Web Audio: a band of noise sweeping up and away
// across the stereo field, under a low swoop. Played by the browser on every world change,
// so it keeps sounding while the old world fades out and the new one loads.

let ctx = null
let noise = null

export function whoosh() {
  try {
    ctx ??= new AudioContext()
  } catch {
    return
  }
  if (ctx.state === 'suspended') ctx.resume()
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const t = ctx.currentTime + 0.02
  const env = (param, peak) => {
    param.setValueAtTime(0, t)
    param.linearRampToValueAtTime(peak, t + 0.35)
    param.setValueAtTime(peak, t + 0.45)
    param.exponentialRampToValueAtTime(0.0001, t + 1.15)
  }

  const n = ctx.createBufferSource()
  n.buffer = noise
  n.loop = true
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 1.2
  bp.frequency.setValueAtTime(250, t)
  bp.frequency.exponentialRampToValueAtTime(3200, t + 0.45)
  bp.frequency.exponentialRampToValueAtTime(400, t + 1.1)
  const pan = ctx.createStereoPanner()
  pan.pan.setValueAtTime(-0.7, t)
  pan.pan.linearRampToValueAtTime(0.7, t + 1.1)
  const g = ctx.createGain()
  env(g.gain, 0.6)
  n.connect(bp).connect(g).connect(pan).connect(ctx.destination)
  n.start(t)
  n.stop(t + 1.3)

  const o = ctx.createOscillator()
  o.frequency.setValueAtTime(90, t)
  o.frequency.exponentialRampToValueAtTime(300, t + 0.5)
  o.frequency.exponentialRampToValueAtTime(60, t + 1.1)
  const og = ctx.createGain()
  env(og.gain, 0.18)
  o.connect(og).connect(ctx.destination)
  o.start(t)
  o.stop(t + 1.3)
}
