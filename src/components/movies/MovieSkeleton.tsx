import { cn } from "@/lib/utils";

interface MovieSkeletonProps {
  size?: 'sm' | 'md' | 'lg';
}

export function MovieSkeleton({ size = 'md' }: MovieSkeletonProps) {
  const sizeClasses = {
    sm: 'w-28 h-40',
    md: 'w-36 h-52',
    lg: 'w-44 h-64',
  };

  return (
    <div className={cn("relative flex-shrink-0", sizeClasses[size])}>
      <div className="h-full w-full rounded-xl bg-secondary animate-pulse">
        <div className="absolute top-2 right-2 w-10 h-5 rounded-lg bg-muted animate-pulse" />
      </div>
    </div>
  );
}

export function MovieRowSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-4">
        <div className="h-10 w-10 rounded-xl bg-secondary animate-pulse" />
        <div className="space-y-2">
          <div className="h-5 w-32 rounded bg-secondary animate-pulse" />
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="flex gap-4 px-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <MovieSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
