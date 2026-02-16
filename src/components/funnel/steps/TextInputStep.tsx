'use client';

import type { TextInputStep } from '@/types/funnel';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useFunnel } from '../FunnelContext';

interface Props {
  step: TextInputStep;
}

export function TextInputStepComponent({ step }: Props) {
  const { goNext, setResponse, getResponse } = useFunnel();
  const [value, setValue] = useState<string>(
    (getResponse(step.id) as string) ?? ''
  );

  const handleContinue = () => {
    if (step.required && !value.trim()) {
      return; // Don't proceed if required and empty
    }
    setResponse(step.id, value);
    goNext();
  };

  const canContinue = !step.required || value.trim().length > 0;

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
          className="text-center mb-6"
          style={{ color: 'var(--funnel-text-secondary)' }}
        >
          {step.description}
        </motion.p>
      )}

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        {step.multiline ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={step.placeholder || 'Type your answer...'}
            rows={5}
            className="w-full px-4 py-3 rounded-2xl border-2 transition-colors resize-none"
            style={{
              borderColor: 'var(--funnel-text-secondary)',
              color: 'var(--funnel-text-primary)',
              backgroundColor: 'var(--funnel-surface)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--funnel-primary)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--funnel-text-secondary)';
            }}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={step.placeholder || 'Type your answer...'}
            className="w-full px-4 py-3 rounded-2xl border-2 transition-colors"
            style={{
              borderColor: 'var(--funnel-text-secondary)',
              color: 'var(--funnel-text-primary)',
              backgroundColor: 'var(--funnel-surface)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--funnel-primary)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--funnel-text-secondary)';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canContinue) {
                handleContinue();
              }
            }}
          />
        )}
      </motion.div>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        whileHover={canContinue ? { scale: 1.02 } : {}}
        whileTap={canContinue ? { scale: 0.98 } : {}}
        onClick={handleContinue}
        disabled={!canContinue}
        className="w-full py-4 px-8 rounded-full text-white font-semibold text-lg shadow-lg transition-opacity"
        style={{
          backgroundColor: 'var(--funnel-primary)',
          boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.2)',
          opacity: canContinue ? 1 : 0.5,
          cursor: canContinue ? 'pointer' : 'not-allowed',
        }}
      >
        Continue
      </motion.button>

      {step.required && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs mt-3"
          style={{ color: 'var(--funnel-text-secondary)' }}
        >
          * Required
        </motion.p>
      )}
    </div>
  );
}
