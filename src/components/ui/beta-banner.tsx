'use client'

interface BetaBannerProps {
  rightSlot?: React.ReactNode
}

export function BetaBanner({ rightSlot }: BetaBannerProps) {
  return (
    <div className="w-full bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 py-1.5 px-2 sm:px-4">
      <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center justify-center gap-2 flex-1">
        {/* Versión del sistema centrada */}
        <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
          aleyashop 1.0
        </span>
        <span className="text-[10px] sm:text-xs font-medium text-[#d06a98] dark:text-[#f29fc8] bg-[#fce4f0] dark:bg-[#f29fc8]/20 px-1.5 py-0.5 rounded">
          Beta
        </span>
        <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
          •
        </span>
        <a
          href="https://programamos.studio"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 hover:text-[#f29fc8] dark:hover:text-[#f29fc8] transition-colors"
        >
          <span className="hidden sm:inline">powered by </span>
          <span className="font-medium">programamos.st</span>
        </a>
        </div>
        {rightSlot ? <div className="flex items-center shrink-0">{rightSlot}</div> : null}
      </div>
    </div>
  )
}
