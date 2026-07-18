# Atlas — Premium Redesign (v2)

The app has been rebuilt around a new design system and an AI-first identity.
Everything visible is now in **English**.

## What's new

### Design system ("Atlas")
- New token system in `src/app/globals.css`: instrument-grade dark theme
  (deep graphite) + warm light theme, one restrained signal color
  (electric azure) reserved for AI and live data.
- **Dark + Light mode** with a flash-free theme script and a toggle
  (`src/components/theme/`). Preference persists.
- Motion primitives: staggered rise-in, skeletons, breathing, reduced-motion
  respected.
- New primitives in `src/components/atlas/`: `ReadinessRing` (the signature
  element), `Stat`, `Panel`, `SectionHeader`.

### AI Coach (real, streaming)
- `/coach` — a full chat that streams from Anthropic via
  `src/app/api/coach/route.ts`.
- Grounded with the user's context (goal, level, equipment, bodyweight) so
  replies are personal.
- **Requires `ANTHROPIC_API_KEY`** in the environment. Without it, the UI
  still works and shows a clear "not connected" message.
- Uses `claude-sonnet-4-20250514`. Change the model in the route if needed.

### Redesigned screens
- **Home** (`/dashboard`): insights-first. Readiness ring, today's session
  with exercise thumbnails, key metrics, an AI insight card, volume trend.
- **Library** (`/ejercicios`): English, premium cards, reads real exercises
  from Supabase.
- **Exercise detail**: English, image carousel, form tips, mistakes, alts.
- **Coach**: new AI-first screen, center of the nav.
- New glass bottom nav (central AI button) + desktop sidebar with theme toggle.

## Setup

### AI Coach
Add to Vercel -> Environment Variables:

    ANTHROPIC_API_KEY=sk-ant-...

Redeploy. The coach goes live immediately.

### Exercises
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` make the library
read your 175 real exercises.

## Honest scope note

This pass delivers a world-class design system, Home, Library, detail, and a
real AI Coach. The brief also described features that are separate products
requiring hardware, paid APIs, or native apps, and were NOT faked here:

- Food Vision AI (photo to calories), video technique analysis, 3D muscle model.
- HealthKit / Whoop / Garmin / Oura integrations (need a native iOS/Android
  app; a web app cannot read HealthKit).
- Professional multi-angle exercise videos (must be licensed or filmed).
- The other specialist "agents": the architecture (one real, grounded coach)
  is here and can be extended into more agents as API budget allows.

Screens still on mock data for user-specific history: Train, Progress,
Nutrition, Measurements. They migrate to Supabase the same way the Library did.
