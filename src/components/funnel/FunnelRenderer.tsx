'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useFunnel } from './FunnelContext';
import { ProgressBar } from './ProgressBar';
import { CheckboxesStepComponent } from './steps/CheckboxesStep';
import { CheckoutStepComponent } from './steps/CheckoutStep';
import { EmailStepComponent } from './steps/EmailStep';
import { HeightPickerStepComponent } from './steps/HeightPickerStep';
import { InfoCardStepComponent } from './steps/InfoCardStep';
import { MultipleChoiceStepComponent } from './steps/MultipleChoiceStep';
import { NumberPickerStepComponent } from './steps/NumberPickerStep';
import { ResultStepComponent } from './steps/ResultStep';
import { TextInputStepComponent } from './steps/TextInputStep';
import { WelcomeStepComponent } from './steps/WelcomeStep';

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

const fadeVariants = {
  enter: { opacity: 0, scale: 0.95 },
  center: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export function FunnelRenderer() {
  const { currentStep, currentStepIndex, config, progress, goPrev } = useFunnel();

  // Track direction for slide animation
  const direction = 1; // Always forward for now

  const animation = currentStep.animation || 'slide';
  const variants = animation === 'fade' ? fadeVariants : slideVariants;

  // Get theme CSS variables
  const themeStyle = {
    '--funnel-primary': config.theme.primary,
    '--funnel-primary-dark': config.theme.primaryDark || config.theme.primary,
    '--funnel-secondary': config.theme.secondary || config.theme.primary,
    '--funnel-accent': config.theme.accent || config.theme.secondary || config.theme.primary,
    '--funnel-background': config.theme.background,
    '--funnel-surface': config.theme.surface || '#ffffff',
    '--funnel-text-primary': config.theme.textPrimary,
    '--funnel-text-secondary': config.theme.textSecondary || '#666666',
    '--funnel-text-on-primary': config.theme.textOnPrimary || '#ffffff',
    '--funnel-border-radius': config.theme.borderRadius || '16px',
  } as React.CSSProperties;

  // Get background style for current step
  const getBackgroundStyle = () => {
    const bg = currentStep.background;
    if (!bg) return { backgroundColor: config.theme.background };

    switch (bg.type) {
      case 'image':
        return {
          backgroundImage: `url(${bg.value})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        };
      case 'gradient':
        return { background: bg.value };
      case 'color':
        return { backgroundColor: bg.value };
      default:
        return { backgroundColor: config.theme.background };
    }
  };

  const renderStep = () => {
    switch (currentStep.type) {
      case 'welcome':
        return <WelcomeStepComponent step={currentStep} />;
      case 'multiple-choice':
        return <MultipleChoiceStepComponent step={currentStep} />;
      case 'checkboxes':
        return <CheckboxesStepComponent step={currentStep} />;
      case 'email':
        return <EmailStepComponent step={currentStep} />;
      case 'text-input':
        return <TextInputStepComponent step={currentStep} />;
      case 'info-card':
        return <InfoCardStepComponent step={currentStep} />;
      case 'number-picker':
        // Special case: use HeightPickerStep for height question
        if (currentStep.id === 'height') {
          return <HeightPickerStepComponent step={currentStep} />;
        }
        return <NumberPickerStepComponent step={currentStep} />;
      case 'checkout':
        return <CheckoutStepComponent step={currentStep} />;
      case 'result':
        return <ResultStepComponent step={currentStep} />;
      default:
        return <div>Unknown step type</div>;
    }
  };

  // Hide progress bar on welcome, result, and checkout steps
  const hideProgressBar =
    currentStep.type === 'welcome' ||
    currentStep.type === 'result' ||
    currentStep.type === 'checkout';

  // Hide back button on welcome, result, and checkout steps
  const hideBackButton = hideProgressBar || currentStepIndex === 0;

  return (
    <div
      className="funnel-container min-h-screen flex flex-col"
      style={{ ...themeStyle, ...getBackgroundStyle() }}
    >
      {/* Progress bar */}
      {!hideProgressBar && (
        <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
          <ProgressBar progress={progress} />
        </div>
      )}

      {/* Back button - Typeform style: minimal chevron below progress bar */}
      {!hideBackButton && (
        <button
          onClick={goPrev}
          className="fixed top-16 left-4 z-40 flex items-center gap-1 p-2 text-sm font-medium transition-all hover:bg-black/5 rounded-full"
          style={{
            color: 'var(--funnel-text-primary)',
          }}
          aria-label="Go back"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* Step content with animation */}
      <div className="flex-1 flex items-center justify-center p-4">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStepIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="w-full max-w-md"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
