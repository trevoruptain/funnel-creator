'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number;
}

export function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: 'var(--funnel-primary)' }}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  );
}
