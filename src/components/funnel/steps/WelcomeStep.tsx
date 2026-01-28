'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useFunnel } from '../FunnelContext';
import type { WelcomeStep } from '@/types/funnel';

interface Props {
  step: WelcomeStep;
}

export function WelcomeStepComponent({ step }: Props) {
  const { goNext } = useFunnel();

  return (
    <div className="flex flex-col items-center text-center px-6 py-12">
      {/* Logo */}
      {step.logo && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.05, duration: 0.4 }}
          className="mb-6"
        >
          <Image
            src={step.logo}
            alt="Aurora"
            width={120}
            height={120}
            className="object-contain"
            priority
          />
        </motion.div>
      )}

      {/* Hero image */}
      {step.image && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mb-8"
        >
          <Image
            src={step.image}
            alt=""
            width={280}
            height={280}
            className="rounded-2xl"
            priority
          />
        </motion.div>
      )}

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-3xl font-bold mb-4"
        style={{ color: 'var(--funnel-text-primary)' }}
      >
        {step.title}
      </motion.h1>

      {step.subtitle && (
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-lg mb-8 max-w-sm"
          style={{ color: 'var(--funnel-text-secondary)' }}
        >
          {step.subtitle}
        </motion.p>
      )}

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={goNext}
        className="w-full max-w-xs py-4 px-8 rounded-full text-white font-semibold text-lg shadow-lg"
        style={{
          backgroundColor: 'var(--funnel-primary)',
          boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.2)',
        }}
      >
        {step.buttonText || 'Get Started'}
      </motion.button>
    </div>
  );
}
