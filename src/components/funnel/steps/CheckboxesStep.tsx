'use client';

import type { CheckboxesStep } from '@/types/funnel';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useFunnel } from '../FunnelContext';

interface Props {
  step: CheckboxesStep;
}

export function CheckboxesStepComponent({ step }: Props) {
  const { goNext, setResponse, getResponse } = useFunnel();
  const [selected, setSelected] = useState<string[]>(
    (getResponse(step.id) as string[]) || []
  );
  const [otherText, setOtherText] = useState<string>('');
  const [showOtherInput, setShowOtherInput] = useState(false);

  // Check if step config has allowOther flag
  const allowOther = (step as any).allowOther;
  const otherPlaceholder = (step as any).otherPlaceholder || 'Please specify...';

  const toggleOption = (optionId: string) => {
    const newSelected = selected.includes(optionId)
      ? selected.filter((id) => id !== optionId)
      : [...selected, optionId];
    setSelected(newSelected);
    setResponse(step.id, newSelected);
    // If an option is selected, hide the "Other" input
    if (showOtherInput && optionId !== 'other') {
      setShowOtherInput(false);
    }
  };

  const toggleOther = () => {
    if (!showOtherInput) {
      setShowOtherInput(true);
      // Add 'other' to selection
      const newSelected = [...selected.filter(id => id !== 'other'), 'other'];
      setSelected(newSelected);
    } else {
      setShowOtherInput(false);
      // Remove 'other' from selection
      const newSelected = selected.filter(id => id !== 'other');
      setSelected(newSelected);
      setOtherText('');
    }
  };

  const handleOtherTextChange = (text: string) => {
    setOtherText(text);
    // Update the response with the other text
    const newSelected = selected.filter(id => id !== 'other');
    if (text.trim()) {
      newSelected.push(`Other: ${text}`);
    }
    setResponse(step.id, newSelected);
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

        {/* Other option */}
        {allowOther && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 + step.options.length * 0.05 }}
          >
            {!showOtherInput ? (
              <button
                onClick={toggleOther}
                className="w-full p-4 rounded-2xl text-left transition-all flex items-center gap-4 hover:bg-opacity-80"
                style={{
                  backgroundColor: 'var(--funnel-surface)',
                  color: 'var(--funnel-text-primary)',
                  boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.05)',
                }}
              >
                <div className="flex-1 font-medium">Other</div>
                <div
                  className="w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center"
                  style={{
                    borderColor: 'var(--funnel-text-secondary)',
                  }}
                >
                </div>
              </button>
            ) : (
              <div className="space-y-3 p-4 rounded-2xl" style={{
                backgroundColor: 'var(--funnel-surface)',
                boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.05)',
              }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium" style={{ color: 'var(--funnel-text-primary)' }}>
                    Other
                  </div>
                  <button
                    onClick={toggleOther}
                    className="text-sm"
                    style={{ color: 'var(--funnel-text-secondary)' }}
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  value={otherText}
                  onChange={(e) => handleOtherTextChange(e.target.value)}
                  placeholder={otherPlaceholder}
                  className="w-full p-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-all"
                  style={{
                    borderColor: 'var(--funnel-text-secondary)',
                    color: 'var(--funnel-text-primary)',
                    backgroundColor: 'white',
                  }}
                  autoFocus
                />
              </div>
            )}
          </motion.div>
        )}
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
