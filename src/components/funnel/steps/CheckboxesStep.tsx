'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useFunnel } from '../FunnelContext';
import type { CheckboxesStep } from '@/types/funnel';

interface Props {
  step: CheckboxesStep;
}

export function CheckboxesStepComponent({ step }: Props) {
  const { goNext, setResponse, getResponse } = useFunnel();
  const [selected, setSelected] = useState<string[]>(
    (getResponse(step.id) as string[]) || []
  );

  const toggleOption = (optionId: string) => {
    setSelected((prev) => {
      const newSelected = prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId];
      setResponse(step.id, newSelected);
      return newSelected;
    });
  };

  const canContinue =
    !step.required ||
    (selected.length >= (step.minSelections || 1) &&
      (!step.maxSelections || selected.length <= step.maxSelections));

  const handleContinue = () => {
    if (canContinue) {
      goNext();
    }
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
        {step.options.map((option, index) => {
          const isSelected = selected.includes(option.id);
          return (
            <motion.button
              key={option.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => toggleOption(option.id)}
              className={`w-full p-4 rounded-2xl text-left transition-all flex items-center gap-4 ${
                isSelected ? 'ring-2' : 'hover:bg-opacity-80'
              }`}
              style={{
                backgroundColor: isSelected
                  ? 'var(--funnel-primary)'
                  : 'var(--funnel-surface)',
                color: isSelected ? '#ffffff' : 'var(--funnel-text-primary)',
                boxShadow: isSelected
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
                      color: isSelected
                        ? 'rgba(255,255,255,0.8)'
                        : 'var(--funnel-text-secondary)',
                    }}
                  >
                    {option.description}
                  </div>
                )}
              </div>
              <div
                className={`w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center ${
                  isSelected ? 'border-white bg-white' : ''
                }`}
                style={{
                  borderColor: isSelected
                    ? '#ffffff'
                    : 'var(--funnel-text-secondary)',
                }}
              >
                {isSelected && (
                  <motion.svg
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-4 h-4"
                    style={{ color: 'var(--funnel-primary)' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </motion.svg>
                )}
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
        className="w-full mt-8 py-4 px-8 rounded-full text-white font-semibold text-lg shadow-lg transition-opacity"
        style={{
          backgroundColor: 'var(--funnel-primary)',
          opacity: canContinue ? 1 : 0.5,
          boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.2)',
        }}
      >
        Continue
      </motion.button>
    </div>
  );
}
