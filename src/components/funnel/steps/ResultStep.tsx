'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import type { ResultStep } from '@/types/funnel';

interface Props {
  step: ResultStep;
}

export function ResultStepComponent({ step }: Props) {
  // Check if this step has a dark/gradient background
  const hasDarkBackground = step.background?.type === 'gradient' || step.background?.type === 'color';
  const textColor = hasDarkBackground ? '#ffffff' : 'var(--funnel-text-primary)';
  const subtextColor = hasDarkBackground ? 'rgba(255,255,255,0.85)' : 'var(--funnel-text-secondary)';
  const featureBg = hasDarkBackground ? 'rgba(255,255,255,0.15)' : 'var(--funnel-surface)';
  const checkColor = hasDarkBackground ? '#ffffff' : 'var(--funnel-primary)';
  const buttonBg = hasDarkBackground ? '#ffffff' : 'var(--funnel-primary)';
  const buttonText = hasDarkBackground ? 'var(--funnel-primary)' : '#ffffff';

  const handleCta = () => {
    if (step.ctaUrl) {
      window.open(step.ctaUrl, '_blank');
    }
  };

  return (
    <div className="flex flex-col items-center px-4 py-8">
      {/* Success icon or image */}
      {step.image ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="mb-6"
        >
          <Image
            src={step.image}
            alt=""
            width={160}
            height={160}
            className="rounded-2xl"
          />
        </motion.div>
      ) : (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="mb-6 w-24 h-24 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: hasDarkBackground ? 'rgba(255,255,255,0.2)' : 'var(--funnel-primary)',
          }}
        >
          <span className="text-4xl">🎉</span>
        </motion.div>
      )}

      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-3xl font-bold mb-2 text-center"
        style={{ color: textColor }}
      >
        {step.title}
      </motion.h2>

      {step.subtitle && (
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6 max-w-sm"
          style={{ color: subtextColor }}
        >
          {step.subtitle}
        </motion.p>
      )}

      {step.features && step.features.length > 0 && (
        <motion.ul
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-sm mb-8 space-y-3"
        >
          {step.features.map((feature, index) => (
            <motion.li
              key={index}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ backgroundColor: featureBg }}
            >
              <span className="text-lg" style={{ color: checkColor }}>
                ✓
              </span>
              <span style={{ color: textColor }}>{feature}</span>
            </motion.li>
          ))}
        </motion.ul>
      )}

      {step.ctaText && (
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCta}
          className="w-full max-w-xs py-4 px-8 rounded-full font-semibold text-lg shadow-lg"
          style={{
            backgroundColor: buttonBg,
            color: buttonText,
            boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.2)',
          }}
        >
          {step.ctaText}
        </motion.button>
      )}
    </div>
  );
}
