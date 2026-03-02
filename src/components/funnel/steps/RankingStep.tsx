'use client';

import type { RankingStep } from '@/types/funnel';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useFunnel } from '../FunnelContext';

interface Props {
  step: RankingStep;
}

export function RankingStepComponent({ step }: Props) {
  const { goNext, setResponse, getResponse } = useFunnel();
  const existing = getResponse(step.id) as string[] | undefined;

  const [ranked, setRanked] = useState<string[]>(() => {
    if (existing && Array.isArray(existing)) return existing;
    return [];
  });

  const handleTap = (optionId: string) => {
    setRanked((prev) => {
      if (prev.includes(optionId)) {
        return prev.filter((id) => id !== optionId);
      }
      return [...prev, optionId];
    });
  };

  const canContinue = ranked.length >= 1;

  const handleContinue = () => {
    setResponse(step.id, ranked);
    goNext();
  };

  return (
    <div className="flex flex-col px-4 py-8">
      <motion.h2
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-2 text-center text-2xl font-bold"
        style={{ color: 'var(--funnel-text-primary)' }}
      >
        {step.question}
      </motion.h2>

      {step.description && (
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-4 text-center text-sm"
          style={{ color: 'var(--funnel-text-secondary)' }}
        >
          {step.description}
        </motion.p>
      )}

      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-5 text-center text-xs font-medium uppercase tracking-wider"
        style={{ color: 'var(--funnel-text-secondary)', opacity: 0.7 }}
      >
        Tap in order of importance
      </motion.p>

      <div className="space-y-3 mt-2">
        {step.options.map((option, index) => {
          const rank = ranked.indexOf(option.id);
          const isRanked = rank !== -1;
          const rankNumber = rank + 1;

          return (
            <motion.button
              key={option.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTap(option.id)}
              className={`w-full rounded-2xl p-4 text-left transition-all flex items-center gap-4 ${
                isRanked ? 'ring-2' : 'hover:bg-opacity-80'
              }`}
              style={{
                backgroundColor: isRanked
                  ? 'var(--funnel-primary)'
                  : 'var(--funnel-surface)',
                color: isRanked ? '#ffffff' : 'var(--funnel-text-primary)',
                boxShadow: isRanked
                  ? '0 4px 14px 0 rgba(0, 0, 0, 0.15)'
                  : '0 2px 8px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all"
                style={{
                  backgroundColor: isRanked ? '#ffffff' : 'transparent',
                  color: isRanked ? 'var(--funnel-primary)' : 'var(--funnel-text-secondary)',
                  border: isRanked ? 'none' : '2px solid var(--funnel-text-secondary)',
                }}
              >
                {isRanked ? (
                  <motion.span
                    key={rankNumber}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    {rankNumber}
                  </motion.span>
                ) : null}
              </div>

              <div className="flex-1 text-sm font-medium leading-snug">
                {option.label}
              </div>
            </motion.button>
          );
        })}
      </div>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: canContinue ? 1.02 : 1 }}
        whileTap={{ scale: canContinue ? 0.98 : 1 }}
        onClick={handleContinue}
        disabled={!canContinue}
        className="mx-auto mt-8 rounded-full px-12 py-4 text-lg font-semibold shadow-lg transition-opacity"
        style={{
          backgroundColor: 'var(--funnel-primary)',
          color: 'var(--funnel-text-on-primary, #ffffff)',
          opacity: canContinue ? 1 : 0.5,
          boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.2)',
        }}
      >
        Continue
      </motion.button>
    </div>
  );
}
