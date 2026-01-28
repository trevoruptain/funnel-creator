'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useFunnel } from '../FunnelContext';
import type { InfoCardStep } from '@/types/funnel';

interface Props {
  step: InfoCardStep;
}

export function InfoCardStepComponent({ step }: Props) {
  const { goNext } = useFunnel();

  // Check if this step has a dark/gradient background
  const hasDarkBackground = step.background?.type === 'gradient' || step.background?.type === 'color';
  const textColor = hasDarkBackground ? '#ffffff' : 'var(--funnel-text-primary)';
  const subtextColor = hasDarkBackground ? 'rgba(255,255,255,0.85)' : 'var(--funnel-text-secondary)';
  const buttonBg = hasDarkBackground ? '#ffffff' : 'var(--funnel-primary)';
  const buttonText = hasDarkBackground ? 'var(--funnel-primary)' : '#ffffff';

  return (
    <div className="flex flex-col items-center px-4 py-8">
      {/* Image with floating animation */}
      {step.image ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{
            scale: 1,
            opacity: 1,
            y: [0, -8, 0], // Subtle floating effect
          }}
          transition={{
            scale: { duration: 0.4 },
            opacity: { duration: 0.4 },
            y: {
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }
          }}
          className="mb-6 relative"
        >
          {/* Soft glow behind image */}
          <motion.div
            className="absolute inset-0 rounded-2xl blur-xl"
            style={{
              background: 'radial-gradient(circle, rgba(233,30,140,0.3) 0%, transparent 70%)',
              transform: 'scale(1.2)',
            }}
            animate={{
              opacity: [0.5, 0.8, 0.5],
              scale: [1.1, 1.25, 1.1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <Image
            src={step.image}
            alt=""
            width={200}
            height={200}
            className="rounded-2xl relative z-10"
          />
        </motion.div>
      ) : (
        // Illustration placeholder
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mb-6 w-44 h-44 rounded-2xl flex items-center justify-center"
          style={{
            backgroundColor: hasDarkBackground ? 'rgba(255,255,255,0.15)' : 'var(--funnel-surface)',
            border: hasDarkBackground ? '2px dashed rgba(255,255,255,0.3)' : '2px dashed var(--funnel-text-secondary)',
          }}
        >
          <span className="text-5xl">
            {step.title.includes('alone') ? '🤝' : step.title.includes('Aurora') ? '🪞' : '✨'}
          </span>
        </motion.div>
      )}

      {step.stat && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="text-5xl font-bold mb-4"
          style={{ color: hasDarkBackground ? '#ffffff' : 'var(--funnel-primary)' }}
        >
          {step.stat}
        </motion.div>
      )}

      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold mb-4 text-center"
        style={{ color: textColor }}
      >
        {step.title}
      </motion.h2>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center mb-8 max-w-sm leading-relaxed"
        style={{ color: subtextColor }}
      >
        {step.description}
      </motion.p>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={goNext}
        className="w-full max-w-xs py-4 px-8 rounded-full font-semibold text-lg shadow-lg"
        style={{
          backgroundColor: buttonBg,
          color: buttonText,
          boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.2)',
        }}
      >
        {step.buttonText || 'Continue'}
      </motion.button>
    </div>
  );
}
