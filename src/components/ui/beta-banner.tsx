'use client'

export function BetaBanner() {
  return (
    <div className="w-full bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 py-1.5 px-2 sm:px-4">
      <div className="max-w-[1920px] mx-auto flex items-center justify-center gap-2">
        {/* Versión del sistema centrada */}
        <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
          Microtiendas 2.0
        </span>
        <span className="text-[10px] sm:text-xs font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/30 px-1.5 py-0.5 rounded">
          Beta
        </span>
        <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
          •
        </span>
        <a
          href="https://programamos.studio"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
        >
          <span className="hidden sm:inline">powered by </span>
          <span className="font-medium">programamos.st</span>
        </a>
      </div>
    </div>
  )
}
