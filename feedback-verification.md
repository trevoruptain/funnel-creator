# Aurora v1 Feedback Verification Checklist

Based on the feedback document, here's what needs to be implemented:

## 2.1 Landing Page Optimization ✅
- [x] Replace Aurora logo with product image (`/illustrations/mirror.png`)
- [x] New headline: "Aurora is your intelligent mirror that helps you stay connected to your pregnancy wellness—without wearables or extra effort"
- [x] Subhead: "Take 2 minutes to unlock an exclusive offer"
- [ ] **CLARIFICATION NEEDED**: "This page as the first funnel questions: What best describes you?"
  - Does this mean the welcome screen should have the pregnancy status question ON IT?
  - Or does it mean the pregnancy status question should be step 2 right after welcome?

## 2.2 Introducing Aurora Screen ✅
- [x] Replace "You're not alone" with "Introducing Aurora"
- [x] Headline: "Aurora offers a daily pregnancy check in, built into your mirror"
- [x] Description: "Aurora brings gentle, everyday insight into your home. No straps, no charging, no extra steps. Just step in front of the mirror and stay more in tune as your body changes."
- [x] Image: `/illustrations/mirror.png`

## 2.3 Beta Tester CTA ✅
- [x] Change from pre-order checkout to beta signup
- [x] Title: "You're on the Aurora early-access list"
- [x] Subtitle: "Want to know what it is? Just book a 15-minute call with the Aurora team to learn more and get exclusive early-bird pricing"
- [x] Button: "Schedule My 15-Min Call"
- [x] Price: $0
- [x] Features list updated (personalized walkthrough, ask questions, insider access, priority consideration, exclusive discounts)

## Minor Adjustments ✅
- [x] Height picker as feet/inches (HeightPickerStep component created)
- [x] Free text questions (3 added):
  - [x] "How do you currently monitor your pregnancy health?"
  - [x] "What's missing from your current routine?"
  - [x] "Which feature interests you most?"
- [x] Back button (Typeform-style minimal chevron)

## What's NOT Clear from Feedback:
1. **Landing page question** - Should "What best describes you?" be embedded in the welcome screen or remain as step 2?
2. **Image matching ad creative** - Feedback says "ideally same image as ad user saw" - we're using generic mirror image

## Implementation Status:
- SQL changes: Applied (need to run `fix-images-and-height.sql` to fix image paths)
- Code components: All created and working
- Database: Needs final image path fix
