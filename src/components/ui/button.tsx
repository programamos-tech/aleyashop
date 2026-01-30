import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function Button({ 
  className, 
  variant = 'default', 
  size = 'default', 
  ...props 
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl text-base font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f29fc8] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none shadow-lg hover:shadow-xl transform hover:-translate-y-0.5",
        {
          "bg-gray-600 text-white hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700": variant === 'default',
          "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700": variant === 'destructive',
          "border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700": variant === 'outline',
          "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600": variant === 'secondary',
          "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white": variant === 'ghost',
          "underline-offset-4 hover:underline text-gray-600 dark:text-gray-400": variant === 'link',
        },
        {
          "h-12 py-3 px-6": size === 'default',
          "h-10 px-4 rounded-lg": size === 'sm',
          "h-14 px-8 rounded-xl": size === 'lg',
          "h-12 w-12 rounded-xl": size === 'icon',
        },
        className
      )}
      {...props}
    />
  )
}
