# WENWEN CONSTITUTION
Version: 1.1
Purpose: Governing principles for building Wenwen through vibe coding / AI-assisted development.
Role: This file acts as the source of truth for product decisions, code behavior, UX quality, architecture standards, and brand consistency.
Last updated: May 19, 2026

---

# 0. CORE IDENTITY

Wenwen is not a chatbot.
Wenwen is not a task manager.
Wenwen is not therapy.

Wenwen is:

> A warm AI companion that helps people feel better, think clearer, and improve daily through small sustainable actions.

Every feature must support that identity.

---

# 1. PRIME DIRECTIVE

Whenever building any feature, ask:

1. Does this reduce emotional friction?
2. Does this help the user return tomorrow?
3. Does this feel warm, safe, and human?
4. Does this create progress without pressure?
5. Is this simple enough to use while mentally tired?

If NO to most of these:
Do not build it.

---

# 2. PRODUCT PHILOSOPHY

## Wenwen should feel like:

- supportive
- low-pressure
- calming
- encouraging
- smart
- present
- emotionally safe

## Wenwen should never feel like:

- robotic
- judgmental
- preachy
- corporate
- cold
- overwhelming
- manipulative

---

# 3. USER STATE ASSUMPTION

Assume the user may be:

- anxious
- tired
- lonely
- overthinking
- distracted
- burned out
- emotionally heavy
- low energy

Therefore all experiences must reduce cognitive load.

---

# 4. DESIGN CONSTITUTION

## UI Rules

Always prefer:

- whitespace
- soft rounded corners
- calm colors
- readable text
- one clear action per screen
- emotional clarity
- minimal clutter

Avoid:

- aggressive notifications
- noisy layouts
- too many buttons
- harsh colors
- confusing navigation
- productivity guilt energy

## Design Emotion Goal

When opening Wenwen, user should feel:

> “Okay... I can handle today.”

---

# 5. UX PRINCIPLES

## Every screen must answer:

1. Where am I?
2. What can I do?
3. What matters most now?
4. How do I leave?

## Interaction Rules

- 1 tap > 2 taps
- obvious > clever
- calm > flashy
- forgiving > strict
- assistive > demanding

## If user misses days:

Never shame them.

Use:

> Welcome back. Start with one small thing.

Never use:

> You missed 5 days.

---

# 6. FEATURE DECISION FRAMEWORK

Before adding a feature, classify it:

## Core Features (highest priority)

- habits / tasks
- journal
- AI companion chat
- emotional check-in
- progress tracking
- reminders

## Support Features

- themes
- cosmetics
- badges
- streak visuals
- avatars

## Dangerous Features (avoid bloat)

- social feeds
- endless settings
- gamification addiction loops
- fake urgency mechanics
- noisy communities
- vanity metrics

If feature does not strengthen core loop, reject it.

---

# 7. CORE LOOP

Daily success loop:

1. Open Wenwen
2. Feel welcomed
3. Check emotional state
4. Complete one small task
5. Receive encouragement
6. Reflect / journal
7. Return tomorrow

Every update must improve this loop.

---

# 8. AI COMPANION CONSTITUTION

## Wenwen AI Tone

- warm
- validating
- concise
- emotionally intelligent
- practical
- hopeful
- grounded

## Wenwen AI Never Says

- guilt language
- fake diagnoses
- guaranteed outcomes
- manipulative attachment statements
- dependency prompts

## Good Responses

- That sounds heavy.
- Want to take one small step together?
- You’ve handled difficult days before.
- It’s okay to start small.

## Bad Responses

- You are failing.
- You need to do more.
- I am the only one who understands you.
- You are broken.

---

# 9. SAFETY RULES

Wenwen is NOT a therapist.

Never claim:

- medical treatment
- diagnosis
- clinical therapy
- cure for anxiety/depression

Always frame as:

- support
- reflection
- wellness guidance
- habit encouragement

If user expresses crisis or self-harm:
Escalate to emergency resources / human support guidance immediately.

---

# 10. CODE CONSTITUTION

## Architecture Rules

Use clean modular architecture.

Recommended:

/src
  /components
  /screens
  /features
  /hooks
  /services
  /utils
  /constants
  /store
  /assets

## Code Rules

- readable > clever
- typed > implicit
- reusable > duplicated
- maintainable > rushed
- simple > overengineered

## Never allow:

- giant files
- magic numbers
- duplicated business logic
- deeply nested components
- random state everywhere

---

# 11. REACT NATIVE / EXPO RULES

Preferred stack:

- React Native Expo
- TypeScript
- React Navigation
- Zustand or Redux Toolkit
- React Query
- Reanimated
- Gesture Handler
- AsyncStorage / SecureStore

## Mobile Performance Rules

- optimize re-renders
- lazy load screens
- animate transform/opacity
- keep bundle lean
- test lower-end devices

---

# 12. STATE MANAGEMENT RULES

Separate state:

## UI State

modals, tabs, toggles

## User State

profile, preferences, streaks

## Domain State

tasks, journal, moods

## Remote State

API data, AI responses

Never mix everything in one store.

---

# 13. DATA MODEL PRINCIPLES

Entities:

- User
- Avatar
- Task
- Completion
- MoodEntry
- JournalEntry
- ChatMessage
- Streak
- Preferences

All records should support timestamps.

createdAt
updatedAt

---

# 14. TASK SYSTEM RULES

Tasks must feel achievable.

Default tasks:

- drink water
- breathe deeply
- short walk
- journal check-in
- stretch
- gratitude note

Tasks should be:

- small
- low resistance
- healthy
- repeatable

Avoid giant tasks.

---

# 15. NOTIFICATION CONSTITUTION

Notifications should feel caring.

Good:

- Good morning. One small win today?
- Time for water 💧
- How did today feel?

Bad:

- Complete tasks now.
- You are behind.
- Don’t break streak.

Limit frequency.
Respect quiet hours.

---

# 16. MONETIZATION CONSTITUTION

Premium should unlock depth, not remove dignity.

Free users must still get real value.

Premium can include:

- unlimited AI chat
- voice companion
- deeper insights
- custom plans
- advanced themes

Never weaponize loneliness for payment.

Never fake scarcity.

---

# 17. ANALYTICS CONSTITUTION

Track:

- retention D1/D7/D30
- tasks completed
- journal usage
- mood check-ins
- session frequency
- notification opens

Do not obsess over vanity installs.

Retention > Downloads

---

# 18. ACCESSIBILITY RULES

Always support:

- readable font sizes
- contrast safety
- touch target sizing
- screen reader labels
- reduced motion mode

---

# 19. CONTENT WRITING RULES

All copy must be:

- human
- short
- warm
- calm
- useful

Avoid soft-label cliches unless the user uses them first:

- gentle
- journey
- safe space
- brave
- healing
- self-care

Replace:

“Submit”

With:

“Save today’s thoughts”

Replace:

“Failed”

With:

“Try again tomorrow”

---

# 20. ANIMATION RULES

Animations should reward, not distract.

Use for:

- task completion
- progress updates
- avatar reactions
- transitions
- streak celebrations

Avoid constant motion.

Subtle > flashy

---

# 21. BUILDING THROUGH VIBE CODING RULES

When prompting AI tools:

Always specify:

- desired user feeling
- business purpose
- platform constraints
- reusable code
- TypeScript support
- accessibility
- performance

Never ask:
“Build me something cool.”

Ask:
“Build a calming task card optimized for retention and mobile performance.”

---

# 22. RELEASE RULES

Ship only if:

- core flow works
- no critical crashes
- onboarding clear
- home screen emotionally warm
- AI responses acceptable
- notifications functional

Do not delay launch for perfection.

---

# 23. NORTH STAR METRIC

Primary metric:

> Weekly active users who complete at least 3 wellness actions.

Because that means Wenwen is helping.

---

# 24. FINAL TEST

Before shipping any feature ask:

Does this make Wenwen feel more like a caring companion?

If no:
Remove it.

---

# 25. FOUNDER REMINDER

People do not download Wenwen for features.

They download Wenwen because life feels heavy.

Build accordingly.

---

# 26. CURRENT IMPLEMENTATION COVERAGE

Status date: May 19, 2026

Overall status:

> Covered for MVP direction. Not fully covered for production release.

## Covered Now

The current implementation covers these constitution areas:

- Core loop: onboarding/login, home, tasks, journal, companion chat, daily check-in, reviews, and return flow exist.
- Home: dynamic greeting, avatar/persona card, progress, weekly rhythm, daily note, task list, and bottom navigation are implemented.
- Tasks: local persisted Zustand store, user-confirmed starter tasks, manual task creation, Gemini suggestions, duplicate filtering, daily routine flag, completion cooldown, and long-press delete confirmation are implemented.
- Journal: free-text journaling, optional photo attachment, daily summaries, historical records, and hidden current-day history are implemented.
- Companion: chat UI, local persisted chat state, Gemini replies, fallback replies, bot persona, cat persona, and persona-specific tone rules are implemented.
- Emotional check-in: once-per-day 1-10 feeling scale is implemented.
- Reviews: daily/weekly review behavior is implemented based on the user setting, with summaries from tasks, journal, and companion chats.
- Notifications: reminder and nightly review scheduling logic exists, with Expo Go limitations understood.
- Avatar/persona: default bot Wenwen and optional cat persona are customizable through the customization tab.
- State management: preferences, tasks, journal, companion, and wellness reviews are separated into Zustand stores.
- Design direction: modern soft UI, light/dark theme tokens, rounded surfaces, calmer colors, and minimal navigation are in place.
- Accessibility basics: many controls include accessibility roles, labels, states, and larger touch targets.
- AI fallback behavior: Gemini failures return local fallback content instead of blocking core flows.

## Partially Covered

These rules are started but need stronger enforcement:

- Safety: companion chat has crisis detection, but journal summaries, task suggestions, wellness reviews, and image-assisted journal summaries still need a shared safety guard.
- Reduced motion: animations exist, but there is no app-level reduced-motion preference or OS reduced-motion handling yet.
- Architecture: stores, services, components, and types are separated, but large Expo Router screen files still need extraction into screen-level modules.
- Notifications: local notification logic exists, but Expo Go cannot fully validate production notification behavior.
- Analytics: no analytics abstraction exists yet; metrics are defined in the constitution but not implemented.
- Privacy: data is local, but there is no user-facing data export/delete flow or privacy policy screen yet.
- API security: Gemini currently runs from the client for prototype speed; production should move AI calls behind a backend/proxy.
- Accessibility: screen reader labels exist in many places, but full screen reader pass, contrast audit, and reduced-motion audit are still pending.

## Not In Scope Yet

These constitution areas are intentionally not built yet:

- Monetization
- Premium features
- Backend auth
- Cloud sync
- Production analytics
- TestFlight/App Store release flow

## Required Before Real Users

Before inviting real external users, finish these items:

1. Add a shared safety layer for crisis/self-harm language across companion, journal, task suggestions, reviews, and image inputs.
2. Move Gemini calls to a backend/proxy so API keys are not shipped in the client.
3. Add reduced-motion support and disable non-essential avatar motion when enabled.
4. Add privacy controls for local data deletion and export.
5. Add an analytics service interface with no-op local implementation first.
6. Extract large app screens into `/src/screens` or feature modules to reduce file size and maintenance risk.
7. Validate notifications in a development build, not Expo Go.
8. Run an accessibility pass on all tabs, modals, forms, and persona controls.

## Current Product Decisions

- Wenwen bot remains the default persona.
- Cat persona is optional and must stay playful, blunt, and direct without cruelty, guilt, or manipulative reverse psychology.
- Starter tasks must never be silently added; the user must confirm or skip.
- Today's journal and companion history should not appear as historical records until a later day.
- Daily routine tasks may carry forward, but one-off tasks should not.
- AI suggestions must avoid duplicate or highly similar tasks.
- Journal image attachment is a memory cue only; the app must not identify people, infer private traits, diagnose health, infer exact location, or assume relationships from images.
- Copy should avoid cliche wellness labels and prefer clear, plain language.

## Final MVP Gate

An MVP build can continue only if:

- Home, tasks, journal, companion, customization, and settings work without critical crashes.
- AI failures do not block user actions.
- Local persistence works after app restart.
- New users understand why tasks, journal, and companion exist.
- The app does not shame missed tasks, unfinished days, or low activity.
- The companion does not diagnose, pressure, or imply dependency.
