'use client';

import type { NumberPickerStep } from '@/types/funnel';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useFunnel } from '../FunnelContext';

interface Props {
  step: NumberPickerStep;
}

export function HeightPickerStepComponent({ step }: Props) {
  const { goNext, setResponse, getResponse } = useFunnel();
  
  // Convert total inches to feet and inches
  const totalInches = (getResponse(step.id) as number) ?? step.defaultValue ?? 64;
  const [feet, setFeet] = useState(Math.floor(totalInches / 12));
  const [inches, setInches] = useState(totalInches % 12);

  const handleContinue = () => {
    const total = feet * 12 + inches;
    setResponse(step.id, total);
    goNext();
  };

  return (
    <div className="flex flex-col px-4 py-8">
      <motion.h2
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-2xl font-bold mb-2 text-center"
        style={{ color: 'var(--funnel-text-primary)' }}
      >
        {step.question}
      </motion.h2>

      {step.description && (
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
          style={{ color: 'var(--funnel-text-secondary)' }}
        >
          {step.description}
        </motion.p>
      )}

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex gap-4 justify-center mb-8"
      >
        {/* Feet selector */}
        <div className="flex flex-col items-center">
          <label className="text-sm mb-2" style={{ color: 'var(--funnel-text-secondary)' }}>
            Feet
          </label>
          <select
            value={feet}
            onChange={(e) => setFeet(parseInt(e.target.value))}
            className="px-6 py-4 text-2xl font-bold rounded-2xl border-2 text-center"
            style={{
              borderColor: 'var(--funnel-text-secondary)',
              color: 'var(--funnel-text-primary)',
              backgroundColor: 'var(--funnel-surface)',
            }}
          >
            {[4, 5, 6, 7].map((f) => (
              <option key={f} value={f}>
                {f}′
              </option>
            ))}
          </select>
        </div>

        {/* Inches selector */}
        <div className="flex flex-col items-center">
          <label className="text-sm mb-2" style={{ color: 'var(--funnel-text-secondary)' }}>
            Inches
          </label>
          <select
            value={inches}
            onChange={(e) => setInches(parseInt(e.target.value))}
            className="px-6 py-4 text-2xl font-bold rounded-2xl border-2 text-center"
            style={{
              borderColor: 'var(--funnel-text-secondary)',
              color: 'var(--funnel-text-primary)',
              backgroundColor: 'var(--funnel-surface)',
            }}
          >
            {Array.from({ length: 12 }, (_, i) => i).map((i) => (
              <option key={i} value={i}>
                {i}″
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center mb-6"
      >
        <p className="text-lg" style={{ color: 'var(--funnel-text-primary)' }}>
          <span className="font-bold text-3xl">{feet}′ {inches}″</span>
          <span className="text-sm ml-2" style={{ color: 'var(--funnel-text-secondary)' }}>
            ({feet * 12 + inches} inches total)
          </span>
        </p>
      </motion.div>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleContinue}
        className="w-full py-4 px-8 rounded-full text-white font-semibold text-lg shadow-lg"
        style={{
          backgroundColor: 'var(--funnel-primary)',
          boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.2)',
        }}
      >
        Continue
      </motion.button>
    </div>
  );
}
