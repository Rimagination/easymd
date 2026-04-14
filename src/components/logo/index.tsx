import type { ElementType } from 'react'

import { Link } from '@tanstack/react-router'

interface LogoProps {
  as?: ElementType | null
}

export function Logo({ as: Component = null }: LogoProps) {
  const link = (
    <Link
      to="/about"
      title="关于 easymd"
      aria-label="关于 easymd"
      className={`
        doto-font text-2xl font-bold tracking-tight text-foreground
        transition-colors
        hover:text-primary
      `}
    >
      easymd
    </Link>
  )

  if (Component === null) {
    return link
  }

  return <Component>{link}</Component>
}
