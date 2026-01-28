'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useFunnel } from '../FunnelContext';
import type { EmailStep } from '@/types/funnel';

interface Props {
  step: EmailStep;
}

export function EmailStepComponent({ step }: Props) {
  const { goNext, setResponse, getResponse } = useFunnel();
  const [email, setEmail] = useState((getResponse(step.id) as string) || '');
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const canContinue = !step.required || isValidEmail(email);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step.required && !isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setResponse(step.id, email);
    // Also store as 'email' for easy access
    setResponse('email', email);
    goNext();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col px-4 py-8">
      <motion.h2
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-2xl font-bold mb-2 text-center"
        style={{ color: 'var(--funnel-text-primary)' }}
      >
        {step.title}
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
        className="mt-4"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder={step.placeholder || 'your@email.com'}
          className="w-full p-4 rounded-2xl text-lg outline-none transition-all"
          style={{
            backgroundColor: 'var(--funnel-surface)',
            color: 'var(--funnel-text-primary)',
            border: error ? '2px solid #ef4444' : '2px solid transparent',
            boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.05)',
          }}
          autoComplete="email"
          autoFocus
        />
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-500 text-sm mt-2 text-center"
          >
            {error}
          </motion.p>
        )}
      </motion.div>

      {step.privacyNote && (
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs text-center mt-4"
          style={{ color: 'var(--funnel-text-secondary)' }}
        >
          {step.privacyNote}
        </motion.p>
      )}

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: canContinue ? 1.02 : 1 }}
        whileTap={{ scale: canContinue ? 0.98 : 1 }}
        type="submit"
        className="w-full mt-6 py-4 px-8 rounded-full text-white font-semibold text-lg shadow-lg transition-opacity"
        style={{
          backgroundColor: 'var(--funnel-primary)',
          opacity: canContinue ? 1 : 0.5,
          boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.2)',
        }}
      >
        {step.buttonText || 'Continue'}
      </motion.button>
    </form>
  );
}
