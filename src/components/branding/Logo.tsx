import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', animated = false, showText = true, className }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
  };

  const iconSize = iconSizes[size];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <motion.div
        className={cn(
          'relative rounded-2xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center',
          sizeClasses[size]
        )}
        animate={animated ? {
          boxShadow: [
            '0 0 20px hsl(var(--primary) / 0.3)',
            '0 0 40px hsl(var(--primary) / 0.5)',
            '0 0 20px hsl(var(--primary) / 0.3)',
          ],
        } : {}}
        transition={animated ? {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        } : {}}
      >
        {/* Film reel icon */}
        <svg 
          width={iconSize} 
          height={iconSize} 
          viewBox="0 0 24 24" 
          fill="none" 
          className="text-white"
        >
          {/* Outer ring */}
          <motion.circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            initial={animated ? { rotate: 0 } : {}}
            animate={animated ? { rotate: 360 } : {}}
            transition={animated ? { duration: 8, repeat: Infinity, ease: 'linear' } : {}}
          />
          {/* Film sprockets */}
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <motion.circle
              key={i}
              cx={12 + 7 * Math.cos((angle * Math.PI) / 180)}
              cy={12 + 7 * Math.sin((angle * Math.PI) / 180)}
              r="1.5"
              fill="currentColor"
              initial={animated ? { scale: 0.8 } : {}}
              animate={animated ? { scale: [0.8, 1.2, 0.8] } : {}}
              transition={animated ? { 
                duration: 1.5, 
                repeat: Infinity, 
                delay: i * 0.15,
                ease: 'easeInOut',
              } : {}}
            />
          ))}
          {/* Inner sync symbol */}
          <motion.path
            d="M12 7v5l3 3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            initial={animated ? { pathLength: 0 } : {}}
            animate={animated ? { pathLength: 1 } : {}}
            transition={animated ? { duration: 1.5, repeat: Infinity, repeatType: 'reverse' } : {}}
          />
          {/* Center dot */}
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>

        {/* Sync waves */}
        {animated && (
          <>
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-white/30"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.3, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-white/30"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.3, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            />
          </>
        )}
      </motion.div>

      {showText && (
        <div className={cn('font-bold tracking-tight', textSizes[size])}>
          <span className="gradient-text">Cinema</span>
          <span className="text-accent">Sync</span>
        </div>
      )}
    </div>
  );
}
