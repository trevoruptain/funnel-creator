'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useFunnel } from '../FunnelContext';
import type { NumberPickerStep } from '@/types/funnel';

interface Props {
  step: NumberPickerStep;
}

export function NumberPickerStepComponent({ step }: Props) {
  const { goNext, setResponse, getResponse } = useFunnel();
  const defaultVal = step.defaultValue ?? Math.floor((step.min + step.max) / 2);
  const [value, setValue] = useState<number>(
    (getResponse(step.id) as number) ?? defaultVal
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemHeight = 56; // Height of each number item

  // Generate array of numbers
  const stepSize = step.step ?? 1;
  const numbers: number[] = [];
  for (let i = step.min; i <= step.max; i += stepSize) {
    numbers.push(i);
  }

  // Scroll to selected value on mount
  useEffect(() => {
    if (scrollRef.current) {
      const index = numbers.indexOf(value);
      if (index !== -1) {
        scrollRef.current.scrollTop = index * itemHeight;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle scroll to update value
  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollTop = scrollRef.current.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      const newValue = numbers[Math.min(Math.max(index, 0), numbers.length - 1)];
      if (newValue !== value) {
        setValue(newValue);
      }
    }
  };

  const handleContinue = () => {
    setResponse(step.id, value);
    goNext();
  };

  // Click on a number to select it
  const handleNumberClick = (num: number) => {
    setValue(num);
    const index = numbers.indexOf(num);
    if (scrollRef.current && index !== -1) {
      scrollRef.current.scrollTo({
        top: index * itemHeight,
        behavior: 'smooth',
      });
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

      {/* Scroll wheel picker */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative mx-auto w-40 mt-4"
      >
        {/* Gradient overlays for fade effect */}
        <div
          className="absolute top-0 left-0 right-0 h-20 z-10 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, var(--funnel-background), transparent)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-20 z-10 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, var(--funnel-background), transparent)',
          }}
        />

        {/* Selection highlight */}
        <div
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-14 rounded-xl z-0"
          style={{
            backgroundColor: 'var(--funnel-primary)',
            opacity: 0.15,
          }}
        />

        {/* Scrollable number list */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-56 overflow-y-auto scroll-smooth hide-scrollbar"
          style={{
            scrollSnapType: 'y mandatory',
          }}
        >
          {/* Spacer for centering - height should be (container height / 2) - (item height / 2) */}
          {/* Container is h-56 (224px), item is h-14 (56px), so spacer = (224/2) - (56/2) = 84px */}
          <div style={{ height: 84 }} />

          {numbers.map((num) => (
            <div
              key={num}
              onClick={() => handleNumberClick(num)}
              className="h-14 flex items-center justify-center cursor-pointer transition-all"
              style={{
                scrollSnapAlign: 'center',
                color:
                  num === value
                    ? 'var(--funnel-primary)'
                    : 'var(--funnel-text-secondary)',
                fontWeight: num === value ? 700 : 400,
                fontSize: num === value ? '2rem' : '1.25rem',
                opacity: num === value ? 1 : 0.5,
              }}
            >
              {num}
              {step.unit && num === value && (
                <span className="ml-2 text-lg font-normal">{step.unit}</span>
              )}
            </div>
          ))}

          {/* Spacer for centering */}
          <div style={{ height: 84 }} />
        </div>
      </motion.div>

      {/* Selected value display */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center mt-6 text-lg font-medium"
        style={{ color: 'var(--funnel-text-primary)' }}
      >
        {value} {step.unit}
      </motion.div>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleContinue}
        className="w-full mt-8 py-4 px-8 rounded-full text-white font-semibold text-lg shadow-lg"
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
