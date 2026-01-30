'use client'

import { cn } from '@/lib/utils'

interface AleyaBadgeProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export function AleyaBadge({ className, size = 'md', showText = true }: AleyaBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  }

  const logoSize = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  return (
    <div className={cn(
      "inline-flex items-center space-x-2 rounded-lg bg-[#f29fc8] text-white font-semibold shadow-sm",
      sizeClasses[size],
      className
    )}>
      <img 
        src="/logo.jpeg" 
        alt="Aleya" 
        className={cn("rounded object-cover", logoSize[size])}
      />
      {showText && (
        <span>Aleya Shop</span>
      )}
    </div>
  )
}
