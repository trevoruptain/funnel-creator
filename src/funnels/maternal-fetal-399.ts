import type { FunnelConfig } from '@/types/funnel';

/**
 * Aurora Maternal-Fetal Funnel - $399 Price Variant
 *
 * This funnel collects information about pregnant users to validate
 * market interest in Aurora's pregnancy monitoring capabilities.
 */
export const maternalFetalFunnel399: FunnelConfig = {
  id: 'maternal-fetal-399-v1',
  name: 'Discover Aurora',
  version: '1.0.0',
  priceVariant: '399',

  theme: {
    primary: '#45108d',
    primaryDark: '#2d0a5c',
    secondary: '#7c0667',
    accent: '#e91e8c',
    background: '#f8f6fc',
    surface: '#ffffff',
    textPrimary: '#1a1a2e',
    textSecondary: '#666680',
    textOnPrimary: '#ffffff',
    borderRadius: '16px',
  },

  steps: [
    // ==================== WELCOME ====================
    {
      id: 'welcome',
      type: 'welcome',
      logo: '/aurora-logo.png',
      title: 'Discover Aurora',
      subtitle: 'Answer a few questions to see if Aurora is right for your pregnancy journey.',
      buttonText: 'Get Started',
      background: {
        type: 'gradient',
        value: 'linear-gradient(135deg, #f8f6fc 0%, #ede7f6 100%)',
      },
    },

    // ==================== BASIC INFO ====================
    {
      id: 'pregnancy-status',
      type: 'multiple-choice',
      question: 'What best describes you?',
      options: [
        { id: 'pregnant', label: "I'm currently pregnant", icon: '🤰' },
        { id: 'trying', label: "I'm trying to conceive", icon: '💕' },
        { id: 'planning', label: "I'm planning to conceive", icon: '📅' },
        { id: 'supporting', label: "I'm supporting someone who is pregnant or trying to conceive", icon: '🤝' },
      ],
    },

    // ==================== REWARD SCREEN 1 - Right after pregnancy status ====================
    {
      id: 'info-personalized',
      type: 'info-card',
      title: "You're not alone",
      description: "Every pregnancy journey is unique. That's why we're building Aurora to provide personalized insights that adapt to your needs.",
      image: '/illustrations/support.png',
      buttonText: 'Continue',
      background: {
        type: 'gradient',
        value: 'linear-gradient(135deg, #45108d 0%, #7c0667 100%)',
      },
    },

    {
      id: 'gender',
      type: 'multiple-choice',
      question: 'How do you identify?',
      options: [
        { id: 'female', label: 'Female', icon: '👩' },
        { id: 'male', label: 'Male', icon: '👨' },
        { id: 'other', label: 'Other / Prefer not to say', icon: '🙂' },
      ],
    },

    // Only show trimester if currently pregnant
    {
      id: 'trimester',
      type: 'multiple-choice',
      question: 'How far along are you?',
      showIf: {
        stepId: 'pregnancy-status',
        operator: 'equals',
        value: 'pregnant',
      },
      options: [
        { id: 'first', label: 'First trimester (weeks 1-12)', icon: '1️⃣' },
        { id: 'second', label: 'Second trimester (weeks 13-26)', icon: '2️⃣' },
        { id: 'third', label: 'Third trimester (weeks 27-40)', icon: '3️⃣' },
        { id: 'unsure', label: "I'm not sure yet", icon: '❓' },
      ],
    },

    // ==================== HEALTH INFO ====================
    // Skip for supporters
    {
      id: 'previous-children',
      type: 'multiple-choice',
      question: 'Is this your first pregnancy?',
      showIf: {
        stepId: 'pregnancy-status',
        operator: 'not_equals',
        value: 'supporting',
      },
      options: [
        { id: 'first', label: 'Yes, this is my first', icon: '👶' },
        { id: 'second', label: "No, I've had one child before", icon: '👧' },
        { id: 'multiple', label: "No, I've had multiple children", icon: '👨‍👩‍👧‍👦' },
      ],
    },

    // Skip height/weight for supporters
    {
      id: 'height',
      type: 'number-picker',
      question: "What's your height?",
      description: 'This helps us understand your health profile',
      showIf: {
        stepId: 'pregnancy-status',
        operator: 'not_equals',
        value: 'supporting',
      },
      min: 48,
      max: 84,
      defaultValue: 64,
      unit: 'inches',
      step: 1,
    },

    {
      id: 'weight',
      type: 'number-picker',
      question: "What's your current weight?",
      description: 'This information stays private',
      showIf: {
        stepId: 'pregnancy-status',
        operator: 'not_equals',
        value: 'supporting',
      },
      min: 80,
      max: 350,
      defaultValue: 150,
      unit: 'lbs',
      step: 5,
    },

    // ==================== CURRENT MONITORING - For pregnant users ====================
    {
      id: 'current-monitoring',
      type: 'checkboxes',
      question: 'How do you currently monitor your pregnancy health?',
      description: 'Select all that apply',
      showIf: {
        stepId: 'pregnancy-status',
        operator: 'equals',
        value: 'pregnant',
      },
      options: [
        { id: 'doctor', label: 'Regular doctor visits', icon: '👩‍⚕️' },
        { id: 'app', label: 'Pregnancy tracking app', icon: '📱' },
        { id: 'wearable', label: 'Wearable device (Fitbit, Apple Watch, etc.)', icon: '⌚' },
        { id: 'doppler', label: 'At-home fetal doppler', icon: '🔊' },
        { id: 'nothing', label: "I don't track regularly", icon: '🤷' },
      ],
      required: false,
    },

    {
      id: 'monitoring-gaps',
      type: 'multiple-choice',
      question: "What's missing from your current routine?",
      showIf: {
        stepId: 'pregnancy-status',
        operator: 'equals',
        value: 'pregnant',
      },
      options: [
        { id: 'peace', label: 'Peace of mind between doctor visits', icon: '😌' },
        { id: 'understanding', label: "Understanding what's normal vs. concerning", icon: '📚' },
        { id: 'partner', label: 'A way for my partner to feel involved', icon: '👫' },
        { id: 'data', label: 'Data to share with my healthcare provider', icon: '📋' },
        { id: 'nothing', label: "I'm happy with my current routine", icon: '✅' },
      ],
    },

    // ==================== FUTURE MONITORING - For trying/planning users ====================
    {
      id: 'future-monitoring',
      type: 'checkboxes',
      question: 'How do you plan to monitor your future pregnancy?',
      description: 'Select all that apply',
      showIf: {
        stepId: 'pregnancy-status',
        operator: 'in',
        value: ['trying', 'planning'],
      },
      options: [
        { id: 'doctor', label: 'Regular doctor visits', icon: '👩‍⚕️' },
        { id: 'app', label: 'Pregnancy tracking app', icon: '📱' },
        { id: 'wearable', label: 'Wearable device', icon: '⌚' },
        { id: 'home-tests', label: 'At-home monitoring tools', icon: '🏠' },
        { id: 'unsure', label: "I haven't decided yet", icon: '🤔' },
      ],
      required: false,
    },

    {
      id: 'future-priorities',
      type: 'multiple-choice',
      question: "What's most important to you for pregnancy monitoring?",
      showIf: {
        stepId: 'pregnancy-status',
        operator: 'in',
        value: ['trying', 'planning'],
      },
      options: [
        { id: 'peace', label: 'Peace of mind between appointments', icon: '😌' },
        { id: 'early-detection', label: 'Early detection of potential issues', icon: '🔍' },
        { id: 'convenience', label: 'Convenient, non-invasive monitoring', icon: '✨' },
        { id: 'partner', label: 'Involving my partner in the journey', icon: '👫' },
        { id: 'data', label: 'Having data to discuss with my doctor', icon: '📋' },
      ],
    },

    // ==================== SUPPORTER QUESTIONS ====================
    {
      id: 'supporter-role',
      type: 'multiple-choice',
      question: 'What is your relationship to the person you\'re supporting?',
      showIf: {
        stepId: 'pregnancy-status',
        operator: 'equals',
        value: 'supporting',
      },
      options: [
        { id: 'partner', label: 'Partner / Spouse', icon: '💑' },
        { id: 'family', label: 'Family member', icon: '👨‍👩‍👧' },
        { id: 'friend', label: 'Friend', icon: '🤝' },
        { id: 'other', label: 'Other', icon: '👤' },
      ],
    },

    {
      id: 'supporter-interest',
      type: 'multiple-choice',
      question: 'What interests you most about Aurora?',
      showIf: {
        stepId: 'pregnancy-status',
        operator: 'equals',
        value: 'supporting',
      },
      options: [
        { id: 'gift', label: 'It would make a great gift', icon: '🎁' },
        { id: 'peace', label: 'Giving them peace of mind', icon: '😌' },
        { id: 'involved', label: 'Staying involved in their journey', icon: '💕' },
        { id: 'curious', label: "Just curious about the product", icon: '👀' },
      ],
    },

    // ==================== REWARD SCREEN 2 ====================
    {
      id: 'info-aurora',
      type: 'info-card',
      title: 'Introducing Aurora',
      description: 'A beautifully designed smart mirror that fits naturally into your bedroom, helping you stay connected to your pregnancy wellness—without wearables or extra effort.',
      image: '/illustrations/mirror.png',
      buttonText: 'Learn More',
      background: {
        type: 'gradient',
        value: 'linear-gradient(135deg, #7c0667 0%, #e91e8c 100%)',
      },
    },

    // ==================== INTEREST & PREFERENCES ====================
    {
      id: 'feature-interest',
      type: 'multiple-choice',
      question: 'Which feature interests you most?',
      options: [
        { id: 'contactless', label: 'Contactless monitoring', description: 'No wearables needed', icon: '✨' },
        { id: 'daily', label: 'Daily wellness insights', icon: '📊' },
        { id: 'trends', label: 'Track changes over time', icon: '📈' },
        { id: 'design', label: 'Beautiful bedroom design', icon: '🪞' },
        { id: 'all', label: 'All of the above', icon: '🙌' },
      ],
    },

    {
      id: 'importance',
      type: 'multiple-choice',
      question: 'How important is pregnancy wellness technology to you?',
      options: [
        { id: 'very', label: "Very important – I'd invest in peace of mind", icon: '💎' },
        { id: 'important', label: 'Important – if the price is right', icon: '👍' },
        { id: 'somewhat', label: 'Somewhat – depends on what it offers', icon: '🤔' },
        { id: 'curious', label: "Just curious for now", icon: '👀' },
      ],
    },

    // ==================== EMAIL CAPTURE ====================
    {
      id: 'email',
      type: 'email',
      title: 'Get Early Access',
      description: "Join the waitlist to be among the first to experience Aurora.",
      placeholder: 'your@email.com',
      buttonText: 'Continue',
      privacyNote: "We'll only email you about Aurora. No spam, ever.",
      required: true,
    },

    // ==================== CHECKOUT ====================
    {
      id: 'checkout',
      type: 'checkout',
      title: 'Reserve Your Aurora',
      subtitle: 'Be among the first to receive Aurora when it launches.',
      price: 399,
      originalPrice: 599,
      currency: 'USD',
      buttonText: 'Reserve Now – $399',
      features: [
        'Priority access when Aurora launches',
        'Lock in early-bird pricing',
        'Free shipping to your door',
        '30-day satisfaction guarantee',
      ],
      guarantee: '100% refundable deposit – cancel anytime before shipping',
      background: {
        type: 'gradient',
        value: 'linear-gradient(135deg, #f8f6fc 0%, #ffffff 100%)',
      },
    },

    // ==================== CONFIRMATION ====================
    {
      id: 'result',
      type: 'result',
      title: "You're on the list!",
      subtitle: "Thank you for reserving Aurora. We'll be in touch soon with updates on your order.",
      features: [
        'Reservation confirmed',
        'Early-bird pricing locked in',
        "We'll email you with next steps",
      ],
      background: {
        type: 'gradient',
        value: 'linear-gradient(135deg, #45108d 0%, #7c0667 100%)',
      },
    },
  ],

  meta: {
    description: 'Maternal-fetal market validation funnel - $399 price point',
    author: 'Aurora Team',
    createdAt: '2026-01-28',
  },
};
