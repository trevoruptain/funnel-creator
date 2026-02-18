'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, ReactNode } from 'react';
import type { FunnelConfig, FunnelResponse, FunnelStep, StepCondition } from '@/types/funnel';
import { useAnalytics } from './AnalyticsProvider';
import { getStoredUTMParams } from '@/lib/analytics';

interface FunnelContextValue {
  config: FunnelConfig;
  currentStepIndex: number;
  responses: Record<string, unknown>;
  totalSteps: number;
  currentStep: FunnelStep;
  progress: number;

  // Navigation
  goNext: () => void;
  goPrev: () => void;
  goToStep: (index: number) => void;

  // Response handling
  setResponse: (stepId: string, value: unknown, opts?: { skipTracking?: boolean }) => void;
  getResponse: (stepId: string) => unknown;

  // Completion
  isComplete: boolean;
  completeData: FunnelResponse | null;
}

const FunnelContext = createContext<FunnelContextValue | null>(null);

interface FunnelProviderProps {
  config: FunnelConfig;
  children: ReactNode;
  onComplete?: (data: FunnelResponse) => void;
}

// Helper to evaluate step conditions
function evaluateCondition(condition: StepCondition, responses: Record<string, unknown>): boolean {
  const responseValue = responses[condition.stepId];

  switch (condition.operator) {
    case 'equals':
      return responseValue === condition.value;
    case 'not_equals':
      return responseValue !== condition.value;
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(responseValue as string);
    case 'not_in':
      return Array.isArray(condition.value) && !condition.value.includes(responseValue as string);
    default:
      return true;
  }
}

// Filter steps based on conditions
function getVisibleSteps(steps: FunnelStep[], responses: Record<string, unknown>): FunnelStep[] {
  return steps.filter((step) => {
    if (!step.showIf) return true;
    return evaluateCondition(step.showIf, responses);
  });
}

export function FunnelProvider({ config, children, onComplete }: FunnelProviderProps) {
  const [currentVisibleIndex, setCurrentVisibleIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [completeData, setCompleteData] = useState<FunnelResponse | null>(null);
  const [startedAt] = useState(new Date().toISOString());
  const prevStepIndex = useRef(0);

  const analytics = useAnalytics();

  // Get visible steps based on current responses
  const visibleSteps = useMemo(
    () => getVisibleSteps(config.steps, responses),
    [config.steps, responses]
  );

  const totalSteps = visibleSteps.length;
  const currentStep = visibleSteps[currentVisibleIndex];
  const currentStepIndex = currentVisibleIndex; // For compatibility
  const progress = ((currentVisibleIndex + 1) / totalSteps) * 100;

  // Track step views when step changes (first step is sent atomically in funnel_start)
  useEffect(() => {
    if (currentStepIndex !== prevStepIndex.current) {
      analytics.trackStepView(currentStep.id, currentStepIndex, currentStep.type);
      prevStepIndex.current = currentStepIndex;
    }
  }, [currentStepIndex, currentStep, analytics]);

  const setResponse = useCallback((stepId: string, value: unknown, opts?: { skipTracking?: boolean }) => {
    setResponses((prev) => ({ ...prev, [stepId]: value }));
    if (!opts?.skipTracking) {
      analytics.trackResponse(stepId, value);
    }
  }, [analytics]);

  const getResponse = useCallback(
    (stepId: string) => responses[stepId],
    [responses]
  );

  const goNext = useCallback(() => {
    if (currentVisibleIndex < totalSteps - 1) {
      setCurrentVisibleIndex((prev) => prev + 1);
    } else {
      // Complete the funnel
      const email = responses['email'] as string | undefined;
      const data: FunnelResponse = {
        funnelId: config.id,
        priceVariant: config.priceVariant,
        startedAt,
        completedAt: new Date().toISOString(),
        responses,
        email,
        metadata: {
          userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
          referrer: typeof document !== 'undefined' ? document.referrer : undefined,
          utmParams: getStoredUTMParams(),
        },
      };
      setCompleteData(data);
      setIsComplete(true);

      onComplete?.(data);
    }
  }, [currentVisibleIndex, totalSteps, config.id, config.priceVariant, startedAt, responses, onComplete, analytics]);

  const goPrev = useCallback(() => {
    if (currentVisibleIndex > 0) {
      setCurrentVisibleIndex((prev) => prev - 1);
    }
  }, [currentVisibleIndex]);

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalSteps) {
        setCurrentVisibleIndex(index);
      }
    },
    [totalSteps]
  );

  return (
    <FunnelContext.Provider
      value={{
        config,
        currentStepIndex,
        responses,
        totalSteps,
        currentStep,
        progress,
        goNext,
        goPrev,
        goToStep,
        setResponse,
        getResponse,
        isComplete,
        completeData,
      }}
    >
      {children}
    </FunnelContext.Provider>
  );
}

export function useFunnel() {
  const context = useContext(FunnelContext);
  if (!context) {
    throw new Error('useFunnel must be used within a FunnelProvider');
  }
  return context;
}
