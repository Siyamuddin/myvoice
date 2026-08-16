import { LandingFooter } from '@/components/landing/LandingFooter'
import { LandingHero } from '@/components/landing/LandingHero'
import { LandingHowItWorks } from '@/components/landing/LandingHowItWorks'

export default function HomePage() {
  return (
    <>
      <LandingHero />
      <LandingHowItWorks />
      <LandingFooter />
    </>
  )
}
