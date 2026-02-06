'use client'

import { Button } from '@/components/ui/button'
import { 
  AlertTriangle, 
  X 
} from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  confirmDisabled?: boolean
  /** Si está definido, se muestra debajo del mensaje y el botón principal pasa a "Entendido" y cierra */
  errorMessage?: string
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  confirmDisabled = false,
  errorMessage
}: ConfirmModalProps) {
  if (!isOpen) return null

  const showErrorState = !!errorMessage

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconColor: 'text-[#d06a98] dark:text-[#f29fc8]',
          iconBg: 'bg-[#fce4f0] dark:bg-[#f29fc8]/20',
          confirmButton: 'bg-[#f29fc8] hover:bg-[#d06a98] text-white',
          borderColor: 'border-[#d06a98] dark:border-[#f29fc8]',
          headerBg: 'bg-[#fce4f0] dark:bg-[#f29fc8]/20'
        }
      case 'warning':
        return {
          iconColor: 'text-orange-400',
          iconBg: 'bg-orange-900/20',
          confirmButton: 'bg-orange-600 hover:bg-orange-700 text-white',
          borderColor: 'border-orange-700',
          headerBg: 'bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20'
        }
      case 'info':
        return {
          iconColor: 'text-blue-400',
          iconBg: 'bg-blue-900/20',
          confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white',
          borderColor: 'border-blue-700',
          headerBg: 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20'
        }
      default:
        return {
          iconColor: 'text-[#d06a98] dark:text-[#f29fc8]',
          iconBg: 'bg-[#fce4f0] dark:bg-[#f29fc8]/20',
          confirmButton: 'bg-[#f29fc8] hover:bg-[#d06a98] text-white',
          borderColor: 'border-[#d06a98] dark:border-[#f29fc8]',
          headerBg: 'bg-[#fce4f0] dark:bg-[#f29fc8]/20'
        }
    }
  }

  const styles = getTypeStyles()

  return (
    <div className="fixed inset-0 xl:left-64 bg-white/70 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 xl:px-6" onClick={e => e.target === e.currentTarget && !confirmDisabled && onClose()}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 ${styles.headerBg} flex-shrink-0`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${styles.iconBg}`}>
              <AlertTriangle className={`h-4 w-4 md:h-5 md:w-5 ${styles.iconColor}`} />
            </div>
            <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed">{message}</p>
          {showErrorState && (
            <div className="mt-4 p-3 rounded-lg bg-[#fce4f0]/50 dark:bg-[#f29fc8]/10 border border-[#d06a98]/30 dark:border-[#f29fc8]/30">
              <p className="text-sm text-[#d06a98] dark:text-[#f29fc8] font-medium">
                {errorMessage}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
          {!showErrorState && (
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              disabled={confirmDisabled}
            >
              {cancelText}
            </Button>
          )}
          <Button
            type="button"
            onClick={showErrorState ? onClose : onConfirm}
            className={styles.confirmButton}
            disabled={confirmDisabled}
          >
            {showErrorState ? 'Entendido' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
