'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'

interface LogoProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ className, showText = false, size = 'md' }: LogoProps) {
  const logoSize = {
    sm: 32,
    md: 48,
    lg: 64
  }[size]

  return (
    <div className={cn("flex items-center", className)}>
      {/* Logo */}
      <Image
        src="/logo.jpeg"
        alt="Aleya Shop Logo"
        width={logoSize}
        height={logoSize}
        className="rounded-full object-cover shadow-md"
        priority
        unoptimized
      />
      {showText && (
        <span className="ml-3 text-xl font-bold text-gray-900 dark:text-white">
          Aleya Shop
        </span>
      )}
    </div>
  )
}
