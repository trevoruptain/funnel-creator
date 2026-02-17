'use client';

import type { CheckoutStep } from '@/types/funnel';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useFunnel } from '../FunnelContext';

interface Props {
  step: CheckoutStep;
}

export function CheckoutStepComponent({ step }: Props) {
  const { goNext, setResponse } = useFunnel();

  const formatPrice = (price: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleReserve = () => {
    setResponse(step.id, {
      reserved: true,
      price: step.price,
      timestamp: new Date().toISOString(),
    });
    goNext();
  };

  return (
    <div className="flex flex-col px-4 py-6">
      {/* Product image placeholder */}
      {step.image ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto mb-6"
        >
          <Image
            src={step.image}
            alt="Aurora"
            width={200}
            height={200}
            className="rounded-2xl"
          />
        </motion.div>
      ) : (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto mb-6 w-48 h-48 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--funnel-surface)' }}
        >
          <span className="text-6xl">🪞</span>
        </motion.div>
      )}

      <motion.h2
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-2xl font-bold mb-2 text-center"
        style={{ color: 'var(--funnel-text-primary)' }}
      >
        {step.title}
      </motion.h2>

      {step.subtitle && (
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-center mb-6"
          style={{ color: 'var(--funnel-text-secondary)' }}
        >
          {step.subtitle}
        </motion.p>
      )}

      {/* Price or Badge display */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-6"
      >
        {(step as any).badge ? (
          <span
            className="inline-block text-lg font-semibold px-6 py-2 rounded-full"
            style={{
              backgroundColor: 'var(--funnel-primary)',
              color: '#fff',
            }}
          >
            {(step as any).badge}
          </span>
        ) : (
          <>
            {step.originalPrice && (
              <span
                className="text-lg line-through mr-2"
                style={{ color: 'var(--funnel-text-secondary)' }}
              >
                {formatPrice(step.originalPrice, step.currency)}
              </span>
            )}
            <span
              className="text-4xl font-bold"
              style={{ color: 'var(--funnel-primary)' }}
            >
              {formatPrice(step.price, step.currency)}
            </span>
            {step.originalPrice && (
              <span
                className="ml-2 text-sm px-2 py-1 rounded-full"
                style={{
                  backgroundColor: 'var(--funnel-primary)',
                  color: '#fff',
                }}
              >
                Save {Math.round(((step.originalPrice - step.price) / step.originalPrice) * 100)}%
              </span>
            )}
          </>
        )}
      </motion.div>

      {/* Features list */}
      {step.features && step.features.length > 0 && (
        <motion.ul
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mb-6 space-y-2"
        >
          {step.features.map((feature, index) => (
            <li
              key={index}
              className="flex items-center gap-3 text-sm"
              style={{ color: 'var(--funnel-text-primary)' }}
            >
              <span style={{ color: 'var(--funnel-primary)' }}>✓</span>
              {feature}
            </li>
          ))}
        </motion.ul>
      )}

      {/* Reserve button */}
      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleReserve}
        className="w-full py-4 px-8 rounded-full text-white font-semibold text-lg shadow-lg"
        style={{
          backgroundColor: 'var(--funnel-primary)',
          boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.2)',
        }}
      >
        {step.buttonText || 'Reserve Your Aurora'}
      </motion.button>

      {/* Guarantee text */}
      {step.guarantee && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs mt-4"
          style={{ color: 'var(--funnel-text-secondary)' }}
        >
          🔒 {step.guarantee}
        </motion.p>
      )}

      {/* Trust badges */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="flex justify-center gap-4 mt-6 text-xs"
        style={{ color: 'var(--funnel-text-secondary)' }}
      >
        <span>✓ Secure checkout</span>
        <span>✓ No payment now</span>
      </motion.div>
    </div>
  );
}
