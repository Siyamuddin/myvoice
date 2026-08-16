export const LandingHowItWorks = () => {
  return (
    <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-28">
      <h2 className="font-display text-2xl text-ink sm:text-4xl">One continuous voice loop</h2>
      <p className="mt-3 max-w-2xl text-base text-ink-soft sm:text-lg">
        Mic audio streams to Gemini Live over a secure WebSocket. You hear the reply as raw PCM —
        no STT → LLM → TTS chain slowing you down.
      </p>
      <ol className="mt-10 grid gap-8 sm:mt-12 sm:grid-cols-3 sm:gap-10">
        {[
          {
            step: '01',
            title: 'Speak',
            body: 'Your browser captures 16 kHz mono PCM and keeps the mic open through playback.',
          },
          {
            step: '02',
            title: 'Relay',
            body: 'JWT-authenticated Spring Boot bridges you to Gemini Live with session caps.',
          },
          {
            step: '03',
            title: 'Reply',
            body: '24 kHz audio returns gap-free. Interrupt anytime — server VAD handles barge-in.',
          },
        ].map((item) => (
          <li key={item.step} className="border-t border-line pt-6">
            <p className="text-sm font-semibold tracking-wide text-teal">{item.step}</p>
            <h3 className="mt-2 font-display text-2xl text-ink">{item.title}</h3>
            <p className="mt-2 text-ink-soft">{item.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
