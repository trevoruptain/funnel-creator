import type { FunnelConfig } from '@/types/funnel';

export const maternalFetalFunnel: FunnelConfig = {
  id: 'maternal-fetal-v1',
  name: 'Discover Aurora',
  version: '1.0.0',

  theme: {
    primary: '#45108d',
    primaryDark: '#2d0a5c',
    secondary: '#7c0667',
    background: '#f8f6fc',
    surface: '#ffffff',
    textPrimary: '#1a1a2e',
    textSecondary: '#666680',
    borderRadius: '16px',
  },

  steps: [
    // Welcome
    {
      id: 'welcome',
      type: 'welcome',
      title: 'Discover Aurora',
      subtitle:
        'Take this 2-minute quiz to see how Aurora can support your pregnancy journey.',
      buttonText: 'Get Started',
      background: {
        type: 'gradient',
        value: 'linear-gradient(135deg, #f8f6fc 0%, #ede7f6 100%)',
      },
    },

    // Gender
    {
      id: 'gender',
      type: 'multiple-choice',
      question: 'What is your gender?',
      options: [
        { id: 'female', label: 'Female', icon: '👩' },
        { id: 'male', label: 'Male', icon: '👨' },
      ],
    },

    // Pregnancy status
    {
      id: 'pregnancy-status',
      type: 'multiple-choice',
      question: 'What best describes you?',
      options: [
        { id: 'pregnant', label: "I'm currently pregnant", icon: '🤰' },
        { id: 'trying', label: "I'm trying to conceive", icon: '💕' },
        { id: 'planning', label: "I'm planning to conceive in the future", icon: '📅' },
        { id: 'supporting', label: "I'm supporting someone who is pregnant", icon: '🤝' },
      ],
    },

    // Stat card
    {
      id: 'stat-complications',
      type: 'info-card',
      stat: '87%',
      title: 'Prevention is Possible',
      description:
        'of pregnancy complications develop gradually between clinic visits. Aurora\'s continuous monitoring catches what appointments miss.',
      buttonText: 'Continue',
    },

    // Trimester
    {
      id: 'trimester',
      type: 'multiple-choice',
      question: 'How far along are you?',
      options: [
        { id: 'first', label: 'First trimester (weeks 1-12)', icon: '1️⃣' },
        { id: 'second', label: 'Second trimester (weeks 13-26)', icon: '2️⃣' },
        { id: 'third', label: 'Third trimester (weeks 27-40)', icon: '3️⃣' },
        { id: 'unsure', label: "I'm not sure", icon: '❓' },
      ],
    },

    // Risk level
    {
      id: 'risk-level',
      type: 'multiple-choice',
      question: 'Is this considered a high-risk pregnancy?',
      options: [
        { id: 'yes', label: 'Yes, my doctor has mentioned this', icon: '⚠️' },
        { id: 'no', label: 'No, everything is routine so far', icon: '✅' },
        { id: 'unsure', label: "I'm not sure", icon: '🤔' },
      ],
    },

    // Monitoring desires (multi-select)
    {
      id: 'monitoring-desires',
      type: 'checkboxes',
      question: 'What would you most like to monitor at home?',
      description: 'Select all that apply',
      options: [
        { id: 'position', label: "Baby's position and movement", icon: '👶' },
        { id: 'health', label: 'My own health indicators', icon: '❤️' },
        { id: 'warnings', label: 'Early warning signs of complications', icon: '🔔' },
        { id: 'changes', label: 'Day-to-day changes in my pregnancy', icon: '📊' },
      ],
      required: false,
    },

    // Feature priority
    {
      id: 'feature-priority',
      type: 'multiple-choice',
      question: 'Which Aurora feature matters most to you?',
      options: [
        { id: 'contactless', label: 'Contactless monitoring', description: 'No wearables needed', icon: '✨' },
        { id: 'continuous', label: 'Continuous 24/7 tracking', icon: '⏰' },
        { id: 'ai', label: 'AI-powered health insights', icon: '🤖' },
        { id: 'alerts', label: 'Early warning alerts', icon: '🚨' },
        { id: 'design', label: 'Beautiful design that fits my home', icon: '🏠' },
      ],
    },

    // Current gaps
    {
      id: 'current-gaps',
      type: 'multiple-choice',
      question: "What's missing from your current pregnancy monitoring?",
      options: [
        { id: 'peace', label: 'Peace of mind between doctor visits', icon: '😌' },
        { id: 'understanding', label: "Understanding what's normal vs. concerning", icon: '📚' },
        { id: 'partner', label: 'Involving my partner in the journey', icon: '👫' },
        { id: 'data', label: 'Having data to share with my doctor', icon: '📋' },
        { id: 'effort', label: "Something that doesn't require effort", icon: '🛋️' },
      ],
    },

    // Investment readiness
    {
      id: 'investment-readiness',
      type: 'multiple-choice',
      question: 'How important is investing in pregnancy monitoring technology?',
      options: [
        { id: 'very', label: "Very important – I'd pay a premium for peace of mind", icon: '💎' },
        { id: 'important', label: 'Important – if the price is reasonable', icon: '👍' },
        { id: 'somewhat', label: 'Somewhat important – depends on the cost', icon: '🤷' },
        { id: 'think', label: "I'd need to think about it", icon: '💭' },
      ],
    },

    // Price sensitivity
    {
      id: 'price-sensitivity',
      type: 'multiple-choice',
      question: 'If Aurora delivered everything you need, what would you expect to invest?',
      options: [
        { id: 'under-200', label: 'Under $200', icon: '💵' },
        { id: '200-400', label: '$200-$400', icon: '💰' },
        { id: '400-600', label: '$400-$600', icon: '💳' },
        { id: '600-plus', label: '$600+', icon: '💎' },
        { id: 'more-info', label: "I'd need more information", icon: '❓' },
      ],
    },

    // Email capture
    {
      id: 'email',
      type: 'email',
      title: "You're Almost There!",
      description:
        "Join 5,000+ families on the Aurora waitlist. We'll notify you when it's ready to ship.",
      placeholder: 'your@email.com',
      buttonText: 'Join the Waitlist',
      privacyNote: "No payment required. We'll only email you about Aurora updates.",
      required: true,
    },

    // Result
    {
      id: 'result',
      type: 'result',
      title: '🪞 Your Aurora is Ready',
      subtitle:
        "Based on your answers, Aurora would be perfect for monitoring your pregnancy journey.",
      features: [
        'Contactless daily health insights',
        'Early warning detection',
        'Peace of mind between visits',
        'Beautiful bedside design',
      ],
      ctaText: 'Learn More About Aurora',
      ctaUrl: 'https://aurorahealth.com',
    },
  ],

  meta: {
    description: 'Maternal-fetal market validation funnel for Aurora smart mirror',
    author: 'Aurora Team',
    createdAt: '2026-01-28',
  },
};
