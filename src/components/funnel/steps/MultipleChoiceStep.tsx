'use client';

import type { MultipleChoiceStep } from '@/types/funnel';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useFunnel } from '../FunnelContext';

interface Props {
  step: MultipleChoiceStep;
}

export function MultipleChoiceStepComponent({ step }: Props) {
  const { goNext, setResponse, getResponse } = useFunnel();
  const [selected, setSelected] = useState<string | null>(
    (getResponse(step.id) as string) || null
  );
  const [otherText, setOtherText] = useState<string>('');
  const [showOtherInput, setShowOtherInput] = useState(false);

  // Check if step config has allowOther flag
  const allowOther = (step as any).allowOther;
  const otherPlaceholder = (step as any).otherPlaceholder || 'Please specify...';

  const handleSelect = (optionId: string) => {
    setSelected(optionId);
    setResponse(step.id, optionId);
    setShowOtherInput(false);
    // Auto-advance after selection with slight delay for visual feedback
    setTimeout(() => goNext(), 300);
  };

  const handleOtherClick = () => {
    setShowOtherInput(true);
    setSelected('other');
  };

  const handleOtherContinue = () => {
    if (otherText.trim()) {
      setResponse(step.id, `Other: ${otherText}`);
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

        {/* Other option */}
        {allowOther && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 + step.options.length * 0.05 }}
          >
            {!showOtherInput ? (
              <button
                onClick={handleOtherClick}
                className={`w-full p-4 rounded-2xl text-left transition-all flex items-center gap-4 ${
                  selected === 'other'
                    ? 'ring-2'
                    : 'hover:bg-opacity-80'
                }`}
                style={{
                  backgroundColor:
                    selected === 'other'
                      ? 'var(--funnel-primary)'
                      : 'var(--funnel-surface)',
                  color:
                    selected === 'other'
                      ? '#ffffff'
                      : 'var(--funnel-text-primary)',
                  boxShadow:
                    selected === 'other'
                      ? '0 4px 14px 0 rgba(0, 0, 0, 0.15)'
                      : '0 2px 8px 0 rgba(0, 0, 0, 0.05)',
                }}
              >
                <div className="flex-1 font-medium">Other</div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    selected === 'other' ? 'border-white bg-white' : ''
                  }`}
                  style={{
                    borderColor:
                      selected === 'other'
                        ? '#ffffff'
                        : 'var(--funnel-text-secondary)',
                  }}
                >
                  {selected === 'other' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: 'var(--funnel-primary)' }}
                    />
                  )}
                </div>
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder={otherPlaceholder}
                  className="w-full p-4 rounded-2xl border-2 focus:outline-none focus:ring-2 transition-all"
                  style={{
                    borderColor: 'var(--funnel-text-secondary)',
                    color: 'var(--funnel-text-primary)',
                    backgroundColor: 'var(--funnel-surface)',
                  }}
                  autoFocus
                />
                <button
                  onClick={handleOtherContinue}
                  disabled={!otherText.trim()}
                  className="w-full py-4 px-8 rounded-full text-white font-semibold text-lg shadow-lg disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--funnel-primary)',
                    boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.2)',
                  }}
                >
                  Continue
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
