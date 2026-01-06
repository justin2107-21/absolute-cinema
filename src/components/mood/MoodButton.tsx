import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MoodButtonProps {
  mood: string;
  icon: LucideIcon;
  color: string;
  isSelected?: boolean;
  onClick: () => void;
}

export function MoodButton({ mood, icon: Icon, color, isSelected, onClick }: MoodButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300",
        "border border-border bg-card/50 backdrop-blur-sm",
        isSelected && "ring-2 ring-offset-2 ring-offset-background",
        color
      )}
    >
      <div className={cn(
        "flex h-12 w-12 items-center justify-center rounded-xl",
        "bg-gradient-to-br from-white/10 to-transparent"
      )}>
        <Icon className="h-6 w-6" />
      </div>
      <span className="text-sm font-medium">{mood}</span>
    </motion.button>
  );
}
