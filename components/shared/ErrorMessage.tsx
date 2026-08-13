import { AlertCircleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
  className?: string
}

export function ErrorMessage({ message, onRetry, className }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-red-800',
        className,
      )}
    >
      <AlertCircleIcon className="size-6 shrink-0 text-red-500" aria-hidden />
      <p className="text-sm font-medium">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-1 border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800"
        >
          Coba Lagi
        </Button>
      )}
    </div>
  )
}
