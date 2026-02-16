'use client';

import type { WelcomeStep } from '@/types/funnel';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import { useFunnel } from '../FunnelContext';

interface Props {
  step: WelcomeStep;
}

export function WelcomeStepComponent({ step }: Props) {
  const { goNext, setResponse } = useFunnel();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Check if welcome has an embedded question
  const hasQuestion = (step as any).hasQuestion;
  const question = (step as any).question;
  const options = (step as any).options || [];

  const handleContinue = () => {
    if (hasQuestion && selectedOption) {
      setResponse(step.id, selectedOption);
    }
    goNext();
  };

  const handleOptionClick = (option: string) => {
    setSelectedOption(option);
    // Auto-advance after selection
    setTimeout(() => {
      setResponse(step.id, option);
      goNext();
    }, 150);
  };

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

      {/* Embedded question (if present) */}
      {hasQuestion && question ? (
        <div className="w-full max-w-md">
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="text-lg font-semibold mb-4"
            style={{ color: 'var(--funnel-text-primary)' }}
          >
            {question}
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="space-y-3"
          >
            {options.map((option: string, index: number) => (
              <motion.button
                key={option}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleOptionClick(option)}
                className={`w-full py-4 px-6 rounded-2xl font-medium text-left transition-all ${
                  selectedOption === option
                    ? 'ring-2 ring-offset-2'
                    : 'hover:shadow-md border'
                }`}
                style={{
                  backgroundColor: selectedOption === option
                    ? 'var(--funnel-primary)'
                    : 'var(--funnel-surface)',
                  color: selectedOption === option
                    ? 'var(--funnel-text-on-primary)'
                    : 'var(--funnel-text-primary)',
                  borderColor: selectedOption === option
                    ? 'transparent'
                    : 'var(--funnel-text-secondary)',
                }}
              >
                {option}
              </motion.button>
            ))}
          </motion.div>
        </div>
      ) : (
        /* Traditional "Get Started" button */
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleContinue}
          className="w-full max-w-xs py-4 px-8 rounded-full text-white font-semibold text-lg shadow-lg"
          style={{
            backgroundColor: 'var(--funnel-primary)',
            boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.2)',
          }}
        >
          {step.buttonText || 'Get Started'}
        </motion.button>
      )}
    </div>
  );
}
