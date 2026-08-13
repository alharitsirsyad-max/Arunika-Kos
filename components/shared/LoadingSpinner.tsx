import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'size-4 border-2',
  md: 'size-7 border-2',
  lg: 'size-10 border-[3px]',
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Memuat..."
      className={cn(
        'animate-spin rounded-full border-current border-b-transparent',
        SIZE_CLASSES[size],
        className,
      )}
    />
  )
}
