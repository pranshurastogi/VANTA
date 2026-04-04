import { InfinityLoader } from '@/components/ui/loader-13'
import { cn } from '@/lib/utils'

function Spinner({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <InfinityLoader
      role="status"
      aria-label="Loading"
      size={16}
      className={cn(className)}
      {...props}
    />
  )
}

export { Spinner }
