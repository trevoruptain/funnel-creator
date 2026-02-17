'use client';

import type { NumberPickerStep } from '@/types/funnel';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
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

  const feetRef = useRef<HTMLDivElement>(null);
  const inchesRef = useRef<HTMLDivElement>(null);
  const itemHeight = 56;

  const feetOptions = [4, 5, 6, 7];
  const inchesOptions = Array.from({ length: 12 }, (_, i) => i);

  // Scroll to selected values on mount
  useEffect(() => {
    if (feetRef.current) {
      const index = feetOptions.indexOf(feet);
      if (index !== -1) {
        feetRef.current.scrollTop = index * itemHeight;
      }
    }
    if (inchesRef.current) {
      const index = inchesOptions.indexOf(inches);
      if (index !== -1) {
        inchesRef.current.scrollTop = index * itemHeight;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle scroll for feet
  const handleFeetScroll = () => {
    if (feetRef.current) {
      const scrollTop = feetRef.current.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      const newFeet = feetOptions[Math.min(Math.max(index, 0), feetOptions.length - 1)];
      if (newFeet !== feet) {
        setFeet(newFeet);
      }
    }
  };

  // Handle scroll for inches
  const handleInchesScroll = () => {
    if (inchesRef.current) {
      const scrollTop = inchesRef.current.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      const newInches = inchesOptions[Math.min(Math.max(index, 0), inchesOptions.length - 1)];
      if (newInches !== inches) {
        setInches(newInches);
      }
    }
  };

  // Click handlers
  const handleFeetClick = (f: number) => {
    setFeet(f);
    const index = feetOptions.indexOf(f);
    if (feetRef.current && index !== -1) {
      feetRef.current.scrollTo({
        top: index * itemHeight,
        behavior: 'smooth',
      });
    }
  };

  const handleInchesClick = (i: number) => {
    setInches(i);
    const index = inchesOptions.indexOf(i);
    if (inchesRef.current && index !== -1) {
      inchesRef.current.scrollTo({
        top: index * itemHeight,
        behavior: 'smooth',
      });
    }
  };

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
          className="text-center mb-6"
          style={{ color: 'var(--funnel-text-secondary)' }}
        >
          {step.description}
        </motion.p>
      )}

      {/* Dual scroll wheel pickers */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex gap-6 justify-center mb-8"
      >
        {/* Feet picker */}
        <div className="flex flex-col items-center">
          <label className="text-xs mb-2 font-medium" style={{ color: 'var(--funnel-text-secondary)' }}>
            FEET
          </label>
          <div className="relative w-24">
            {/* Gradient overlays */}
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

            {/* Scrollable list */}
            <div
              ref={feetRef}
              onScroll={handleFeetScroll}
              className="h-56 overflow-y-auto scroll-smooth hide-scrollbar"
              style={{
                scrollSnapType: 'y mandatory',
              }}
            >
              <div style={{ height: 84 }} />
              {feetOptions.map((f) => (
                <div
                  key={f}
                  onClick={() => handleFeetClick(f)}
                  className="h-14 flex items-center justify-center cursor-pointer transition-all"
                  style={{
                    scrollSnapAlign: 'center',
                    color: f === feet ? 'var(--funnel-primary)' : 'var(--funnel-text-secondary)',
                    fontWeight: f === feet ? 700 : 400,
                    fontSize: f === feet ? '2rem' : '1.25rem',
                    opacity: f === feet ? 1 : 0.5,
                  }}
                >
                  {f}′
                </div>
              ))}
              <div style={{ height: 84 }} />
            </div>
          </div>
        </div>

        {/* Inches picker */}
        <div className="flex flex-col items-center">
          <label className="text-xs mb-2 font-medium" style={{ color: 'var(--funnel-text-secondary)' }}>
            INCHES
          </label>
          <div className="relative w-24">
            {/* Gradient overlays */}
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

            {/* Scrollable list */}
            <div
              ref={inchesRef}
              onScroll={handleInchesScroll}
              className="h-56 overflow-y-auto scroll-smooth hide-scrollbar"
              style={{
                scrollSnapType: 'y mandatory',
              }}
            >
              <div style={{ height: 84 }} />
              {inchesOptions.map((i) => (
                <div
                  key={i}
                  onClick={() => handleInchesClick(i)}
                  className="h-14 flex items-center justify-center cursor-pointer transition-all"
                  style={{
                    scrollSnapAlign: 'center',
                    color: i === inches ? 'var(--funnel-primary)' : 'var(--funnel-text-secondary)',
                    fontWeight: i === inches ? 700 : 400,
                    fontSize: i === inches ? '2rem' : '1.25rem',
                    opacity: i === inches ? 1 : 0.5,
                  }}
                >
                  {i}″
                </div>
              ))}
              <div style={{ height: 84 }} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Selected value display */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
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
