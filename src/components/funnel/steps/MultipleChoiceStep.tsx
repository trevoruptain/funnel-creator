'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useFunnel } from '../FunnelContext';
import type { MultipleChoiceStep } from '@/types/funnel';

interface Props {
  step: MultipleChoiceStep;
}

export function MultipleChoiceStepComponent({ step }: Props) {
  const { goNext, setResponse, getResponse } = useFunnel();
  const [selected, setSelected] = useState<string | null>(
    (getResponse(step.id) as string) || null
  );

  const handleSelect = (optionId: string) => {
    setSelected(optionId);
    setResponse(step.id, optionId);
    // Auto-advance after selection with slight delay for visual feedback
    setTimeout(() => goNext(), 300);
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
          className="text-center mb-6"
          style={{ color: 'var(--funnel-text-secondary)' }}
        >
          {step.description}
        </motion.p>
      )}

      <div className="space-y-3 mt-4">
        {step.options.map((option, index) => (
          <motion.button
            key={option.id}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => handleSelect(option.id)}
            className={`w-full p-4 rounded-2xl text-left transition-all flex items-center gap-4 ${
              selected === option.id
                ? 'ring-2'
                : 'hover:bg-opacity-80'
            }`}
            style={{
              backgroundColor:
                selected === option.id
                  ? 'var(--funnel-primary)'
                  : 'var(--funnel-surface)',
              color:
                selected === option.id
                  ? '#ffffff'
                  : 'var(--funnel-text-primary)',
              boxShadow:
                selected === option.id
                  ? '0 4px 14px 0 rgba(0, 0, 0, 0.15)'
                  : '0 2px 8px 0 rgba(0, 0, 0, 0.05)',
            }}
          >
            {option.icon && (
              <span className="text-2xl flex-shrink-0">{option.icon}</span>
            )}
            <div className="flex-1">
              <div className="font-medium">{option.label}</div>
              {option.description && (
                <div
                  className="text-sm mt-0.5"
                  style={{
                    color:
                      selected === option.id
                        ? 'rgba(255,255,255,0.8)'
                        : 'var(--funnel-text-secondary)',
                  }}
                >
                  {option.description}
                </div>
              )}
            </div>
            <div
              className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                selected === option.id ? 'border-white bg-white' : ''
              }`}
              style={{
                borderColor:
                  selected === option.id
                    ? '#ffffff'
                    : 'var(--funnel-text-secondary)',
              }}
            >
              {selected === option.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: 'var(--funnel-primary)' }}
                />
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
