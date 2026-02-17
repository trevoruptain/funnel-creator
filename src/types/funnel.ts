/**
 * Aurora Funnel System - Type Definitions
 *
 * JSON-driven funnel configuration for app-like survey experiences.
 */

// Step types supported by the funnel renderer
export type StepType =
  | 'welcome'
  | 'multiple-choice'
  | 'checkboxes'
  | 'email'
  | 'text-input'
  | 'number-picker'
  | 'info-card'
  | 'checkout'
  | 'result';

// Condition for showing/hiding steps
export interface StepCondition {
  stepId: string; // The step to check the response of
  operator: 'equals' | 'not_equals' | 'in' | 'not_in';
  value: string | string[]; // The value(s) to compare against
}

// Base step interface
export interface BaseStep {
  id: string;
  type: StepType;
  // Conditional display - step only shows if condition is met
  showIf?: StepCondition;
  // Optional background image/gradient
  background?: {
    type: 'image' | 'gradient' | 'color';
    value: string; // URL for image, CSS gradient, or hex color
  };
  // Optional animation override
  animation?: 'slide' | 'fade' | 'scale' | 'none';
}

// Welcome/intro step
export interface WelcomeStep extends BaseStep {
  type: 'welcome';
  title: string;
  subtitle?: string;
  logo?: string; // Logo image URL
  image?: string; // Hero image URL
  buttonText?: string; // Default: "Get Started"
}

// Single-select question
export interface MultipleChoiceStep extends BaseStep {
  type: 'multiple-choice';
  question: string;
  description?: string;
  options: {
    id: string;
    label: string;
    icon?: string; // Emoji or image URL
    description?: string;
  }[];
  required?: boolean; // Default: true
}

// Multi-select question
export interface CheckboxesStep extends BaseStep {
  type: 'checkboxes';
  question: string;
  description?: string;
  options: {
    id: string;
    label: string;
    icon?: string;
    description?: string;
  }[];
  minSelections?: number;
  maxSelections?: number;
  required?: boolean;
}

// Email capture
export interface EmailStep extends BaseStep {
  type: 'email';
  title: string;
  description?: string;
  placeholder?: string;
  buttonText?: string; // Default: "Continue"
  privacyNote?: string;
  required?: boolean;
}

// Text input (short answer)
export interface TextInputStep extends BaseStep {
  type: 'text-input';
  question: string;
  description?: string;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
}

// Number picker (scroll wheel style)
export interface NumberPickerStep extends BaseStep {
  type: 'number-picker';
  question: string;
  description?: string;
  min: number;
  max: number;
  defaultValue?: number;
  unit?: string; // e.g., "lbs", "cm", "years"
  step?: number; // Default: 1
  required?: boolean;
}

// Info/stat card (educational content between questions)
export interface InfoCardStep extends BaseStep {
  type: 'info-card';
  stat?: string; // Big number like "87%"
  title: string;
  description: string;
  image?: string; // Illustration placeholder
  bullets?: string[]; // Optional bullet points
  buttonText?: string; // Default: "Continue"
}

// Checkout/reserve step
export interface CheckoutStep extends BaseStep {
  type: 'checkout';
  title: string;
  subtitle?: string;
  price: number; // e.g., 399
  originalPrice?: number; // For showing "was $X" strikethrough
  currency?: string; // Default: "USD"
  buttonText?: string; // Default: "Reserve Your Aurora"
  features?: string[]; // What's included
  guarantee?: string; // e.g., "100% refundable deposit"
  image?: string;
}

// Final result/confirmation step
export interface ResultStep extends BaseStep {
  type: 'result';
  title: string;
  subtitle?: string;
  image?: string;
  features?: string[]; // List of benefits/features
  ctaText?: string;
  ctaUrl?: string;
}

// Union type for all steps
export type FunnelStep =
  | WelcomeStep
  | MultipleChoiceStep
  | CheckboxesStep
  | EmailStep
  | TextInputStep
  | NumberPickerStep
  | InfoCardStep
  | CheckoutStep
  | ResultStep;

// Theme configuration
export interface FunnelTheme {
  // Brand colors
  primary: string;
  primaryDark?: string;
  secondary?: string;
  accent?: string; // For highlights, gradients on reward screens

  // Background colors
  background: string;
  surface?: string;

  // Text colors
  textPrimary: string;
  textSecondary?: string;
  textOnPrimary?: string; // Text color when on primary bg

  // UI elements
  borderRadius?: string; // Default: "16px"
  buttonRadius?: string; // Default: "full" for pill buttons

  // Typography
  fontFamily?: string;
  headingFontFamily?: string;
}

// Complete funnel definition
export interface FunnelConfig {
  id: string;
  name: string;
  version?: string;

  // Price variant for A/B testing
  priceVariant?: string; // e.g., "399", "299", "499"

  // Theme
  theme: FunnelTheme;

  // Steps in order
  steps: FunnelStep[];

  // Metadata
  meta?: {
    description?: string;
    author?: string;
    createdAt?: string;
    updatedAt?: string;
  };

  // Analytics/tracking
  tracking?: {
    pixelId?: string;
    gtmId?: string;
    utmSource?: string;
  };
}

// Response data collected from user
export interface FunnelResponse {
  funnelId: string;
  priceVariant?: string;
  startedAt: string;
  completedAt?: string;
  responses: Record<string, unknown>; // stepId -> answer
  email?: string;
  metadata?: {
    userAgent?: string;
    referrer?: string;
    utmParams?: Record<string, string>;
  };
}
