import Link from 'next/link'
import { APP_NAME } from '@/lib/config'

type AppLogoProps = {
  href?: string
  tone?: 'light' | 'dark'
  className?: string
}

export const AppLogo = ({ href = '/', tone = 'dark', className = '' }: AppLogoProps) => {
  const color = tone === 'light' ? 'text-white' : 'text-ink'

  return (
    <Link
      href={href}
      className={`inline-flex items-baseline gap-1 font-display text-2xl tracking-tight sm:text-3xl ${color} ${className}`}
      aria-label={`${APP_NAME} home`}
      tabIndex={0}
    >
      <span>{APP_NAME}</span>
      <span
        className={`h-2 w-2 rounded-full ${tone === 'light' ? 'bg-teal-bright' : 'bg-teal'}`}
        aria-hidden="true"
      />
    </Link>
  )
}
