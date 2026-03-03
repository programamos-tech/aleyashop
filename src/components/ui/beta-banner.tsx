'use client'

import { Zap } from 'lucide-react'

interface BetaBannerProps {
  rightSlot?: React.ReactNode
}

export function BetaBanner({ rightSlot }: BetaBannerProps) {
  return (
    <div className="w-full bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 py-1.5 px-2 sm:px-4">
      <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center justify-center gap-2 flex-1">
          <Zap className="h-3 w-3 shrink-0" style={{ color: '#ff9568' }} />
          <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
            aleyashop 1.5
          </span>
          <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
            •
          </span>
          <a
            href="https://andresruss.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] sm:text-xs transition-colors group inline-flex items-baseline gap-0.5"
          >
            <span className="hidden sm:inline text-gray-500 dark:text-gray-400">powered by </span>
            <span className="font-bold group-hover:opacity-90" style={{ color: '#ff9568' }}>
              programamos.st
            </span>
          </a>
        </div>
        {rightSlot ? <div className="flex items-center shrink-0">{rightSlot}</div> : null}
      </div>
    </div>
  )
}
