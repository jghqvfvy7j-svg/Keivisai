import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

/**
 * Landing page.
 *
 * The brand is the app's real dark + volt-green identity. The distinctive move
 * is to lead with the product's own voice (the coach answering with concrete
 * numbers) and to show actual pieces of the real UI: a coach exchange, the plan
 * view, a logged meal, the Net Energy bars. Numbers use the mono data face.
 * Green means you / eaten / progress; orange means burned / effort, exactly as
 * inside the app. No decorative icons.
 */

// Data accent, matched to the app. Orange only ever means "over your goal".
const OVER = "#f97316";
const GOAL = 2200;

// Calorie intake bars, reconstructed from the real screen: each day is what you
// ate, green when at or under your goal, orange when over. Dashed line is goal.
function IntakeBars() {
  const days = [2050, 1780, 2320, 1960, 2180, 2460, 1690, 2110];
  const max = 2700;
  const avg = Math.round(days.reduce((s, d) => s + d, 0) / days.length);
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-muted">Calories, last 8 days</p>
        <p className="font-score text-sm font-bold text-volt">
          {avg.toLocaleString()} avg · goal {GOAL.toLocaleString()}
        </p>
      </div>
      <div className="relative mt-3 h-24">
        {/* goal line */}
        <div
          className="absolute inset-x-0 border-t border-dashed border-muted"
          style={{ bottom: `${(GOAL / max) * 100}%` }}
        />
        <div className="flex h-full items-end gap-2">
          {days.map((kcal, i) => (
            <div key={i} className="flex flex-1 items-end justify-center">
              <span
                className="w-3 rounded-t"
                style={{ height: `${(kcal / max) * 100}%`, background: kcal > GOAL ? OVER : "var(--volt)" }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-volt" /> At or under goal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: OVER }} /> Over
        </span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-bg">
      {/* Nav */}
      <header className="mx-auto flex max-w-md items-center justify-between px-5 pt-safe pb-2 lg:max-w-6xl lg:px-8 lg:pt-6">
        <Logo variant="full" />
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-semibold text-muted hover:text-foreground">
            Sign in
          </Link>
          <Button asChild size="sm" className="pressable hidden sm:inline-flex">
            <Link href="/signup">Start free</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pb-20 lg:max-w-6xl lg:px-8">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="mt-10 lg:mt-20 lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14">
          <div className="animate-fade-up">
            <p className="font-score text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              GymTrack Pro · train, eat, ask
            </p>
            <h1 className="mt-5 font-display text-[2.7rem] font-bold leading-[1.02] tracking-tight lg:text-[4.4rem]">
              The coach reads
              <br />
              your numbers and
              <br />
              <span className="text-volt">says what&apos;s next.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted lg:text-lg">
              Log a set, a meal, a bodyweight. Your coach turns it into a plain answer,
              like add 2.5&nbsp;kg, eat 30&nbsp;g more protein, or take the rest day. No
              chart to squint at.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="pressable w-full sm:w-auto">
                <Link href="/signup">Start free →</Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="pressable w-full sm:w-auto">
                <Link href="/login">I have an account</Link>
              </Button>
            </div>
            <p className="font-score mt-5 text-[11px] tracking-wide text-muted-2">
              Free to start · no card · installs to your home screen
            </p>
          </div>

          {/* Hero artifact: a lively coach exchange (not real user data). */}
          <div className="animate-fade-up delay-2 mt-12 lg:mt-0">
            <div className="glass mx-auto max-w-sm rounded-[1.75rem] p-4 shadow-2xl">
              <div className="flex items-center justify-between px-1 pb-3">
                <span className="font-display text-sm font-bold">Coach</span>
                <span className="font-score text-[11px] text-volt">Lucas · online</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="ml-auto max-w-[82%] rounded-3xl rounded-br-lg bg-volt px-4 py-2.5 text-sm text-volt-foreground">
                  Can I skip legs today? 😅
                </div>
                <div className="mr-auto max-w-[88%] rounded-3xl rounded-bl-lg border border-border bg-surface px-4 py-2.5 text-sm leading-relaxed">
                  Ha, nice try 💪 You&apos;ve hit upper body twice this week already. Legs
                  today, rest day tomorrow, you earned it. Start with squats{" "}
                  <span className="font-score font-semibold text-volt">4×8</span>. Let&apos;s move. 🔥
                </div>
                <div className="ml-auto max-w-[82%] rounded-3xl rounded-br-lg bg-volt px-4 py-2.5 text-sm text-volt-foreground">
                  ok ok, warming up now
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* real, checkable specifics, in the data face */}
        <section className="mt-14 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:mt-24">
          {[
            { n: "344", l: "exercises, with guidance" },
            { n: "24", l: "recipes, exact grams" },
            { n: "24/7", l: "coach that answers" },
          ].map((s) => (
            <div key={s.l} className="bg-bg px-4 py-6 text-center">
              <p className="font-score text-3xl font-bold text-volt lg:text-4xl">{s.n}</p>
              <p className="mt-1.5 text-xs text-muted">{s.l}</p>
            </div>
          ))}
        </section>

        {/* ── Pillar 1: Coach ──────────────────────────────────────── */}
        <section className="mt-20 lg:mt-28 lg:grid lg:grid-cols-2 lg:items-center lg:gap-14">
          <div>
            <p className="font-score text-[11px] uppercase tracking-[0.18em] text-muted-2">The coach</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight lg:text-[2.75rem] lg:leading-[1.05]">
              It knows your history.
              <br />
              <span className="text-volt">So it answers straight.</span>
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Lucas, or Helena if you prefer, is built around your goal, your level and
              what you&apos;ve logged. Ask anything about training, food or recovery and
              you get numbers, not a wall of maybe. Snap a photo of your plate and it reads
              it. Ask it to set your calories or build your week, and it just does it. If
              you allow it, it remembers what matters, like a cranky shoulder or your best
              lifts, and you can pause or clear that memory anytime.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-2 lg:mt-0">
            {[
              { text: "Chest again tomorrow? 🙏", mine: true },
              { text: "You went heavy today 💪 give it 48h. Pull tomorrow, chest Friday.", mine: false },
              { text: "my bench won't move past 60kg 😤", mine: true },
              { text: "Stuck 3 weeks. Drop to 52.5, add a lighter set after, build back up. You'll fly past 60. 🔥", mine: false },
            ].map((m, i) => (
              <div
                key={i}
                className={
                  m.mine
                    ? "ml-auto max-w-[82%] rounded-3xl rounded-br-lg bg-volt px-4 py-2.5 text-sm text-volt-foreground"
                    : "mr-auto max-w-[86%] rounded-3xl rounded-bl-lg border border-border bg-surface px-4 py-2.5 text-sm leading-relaxed"
                }
              >
                {m.text}
              </div>
            ))}
          </div>
        </section>

        {/* ── Pillar 2: Train ──────────────────────────────────────── */}
        <section className="mt-20 lg:mt-28 lg:grid lg:grid-cols-2 lg:items-center lg:gap-14">
          <div className="order-2 mt-8 lg:order-1 lg:mt-0">
            {/* the real plan view: name, split, day tabs, exercises */}
            <div className="rounded-2xl border border-border bg-surface p-5">
              <p className="text-xs text-muted">Active plan</p>
              <p className="font-display text-xl font-bold">Upper / Lower</p>
              <div className="mt-3 flex gap-2">
                <span className="rounded-full bg-volt px-2.5 py-1 font-score text-[11px] font-semibold text-volt-foreground">
                  4 days a week
                </span>
                <span className="rounded-full border border-border px-2.5 py-1 font-score text-[11px] text-muted">
                  Upper Lower
                </span>
              </div>
              <div className="mt-4 flex gap-2 border-b border-border pb-2 text-xs font-semibold">
                <span className="text-volt">Upper A</span>
                <span className="text-muted-2">Lower A</span>
                <span className="text-muted-2">Upper B</span>
                <span className="text-muted-2">Lower B</span>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {[
                  ["Bench press", "4 sets × 8 · 42.5 kg", "90s"],
                  ["Barbell row", "4 sets × 10 · 50 kg", "90s"],
                  ["Overhead press", "3 sets × 8 · 30 kg", "75s"],
                ].map(([name, detail, rest]) => (
                  <div key={name} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                    <span className="h-9 w-9 shrink-0 rounded-lg bg-surface-3" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{name}</p>
                      <p className="font-score text-[11px] text-muted">{detail}</p>
                    </div>
                    <span className="font-score text-[11px] text-muted">{rest}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="font-score text-[11px] uppercase tracking-[0.18em] text-muted-2">Train</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight lg:text-[2.75rem] lg:leading-[1.05]">
              A plan for the days
              <br />
              <span className="text-volt">you actually train.</span>
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Pick a split, like full body, push/pull/legs or upper/lower, and each day
              fills with 4 to 5 exercises from a library of 344, matched to your gear and
              never repeated. Every day sits in its own tab, so you always know what&apos;s
              next. Tap Start and it logs the session with you, set by set, then saves it so
              your coach can see the trend.
            </p>
          </div>
        </section>

        {/* ── Pillar 3: Nutrition ──────────────────────────────────── */}
        <section className="mt-20 lg:mt-28 lg:grid lg:grid-cols-2 lg:items-center lg:gap-14">
          <div>
            <p className="font-score text-[11px] uppercase tracking-[0.18em] text-muted-2">Nutrition</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight lg:text-[2.75rem] lg:leading-[1.05]">
              Eat by the numbers,
              <br />
              <span className="text-volt">not by feel.</span>
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Type a meal the way you&apos;d say it, like two eggs, oats and a banana, and
              get the calories and macros back in a second. Keep 24 recipes on hand with the
              grams already weighed out, so hitting your protein is one tap, not a math
              problem.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 lg:mt-0">
            {/* a meal you typed, turned into macros */}
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-xs text-muted">You typed</p>
              <p className="mt-0.5 text-sm font-semibold">&ldquo;Chicken breast, rice and half an avocado&rdquo;</p>
              <div className="mt-3 flex gap-2">
                {[["kcal", "560"], ["protein", "48 g"], ["carbs", "52 g"], ["fat", "16 g"]].map(([l, v]) => (
                  <div key={l} className="flex-1 rounded-xl bg-surface-2 px-2 py-2 text-center">
                    <p className="font-score text-sm font-bold text-volt">{v}</p>
                    <p className="text-[10px] text-muted">{l}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* a ready recipe with grams weighed out */}
            <div className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <p className="font-display font-bold">Greek Yogurt Power Bowl</p>
                <p className="font-score text-xs text-muted">1 serving</p>
              </div>
              <div className="mt-3 flex gap-2">
                {[["kcal", "410"], ["protein", "34 g"], ["carbs", "38 g"], ["fat", "12 g"]].map(([l, v]) => (
                  <div key={l} className="flex-1 rounded-xl bg-surface-2 px-2 py-2 text-center">
                    <p className="font-score text-sm font-bold">{v}</p>
                    <p className="text-[10px] text-muted">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Calorie intake (real, clearly explained) ─────────────── */}
        <section className="mt-20 lg:mt-28 lg:grid lg:grid-cols-2 lg:items-center lg:gap-14">
          <div className="order-2 mt-8 lg:order-1 lg:mt-0">
            <IntakeBars />
          </div>
          <div className="order-1 lg:order-2">
            <p className="font-score text-[11px] uppercase tracking-[0.18em] text-muted-2">Calorie intake</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight lg:text-[2.75rem] lg:leading-[1.05]">
              Your intake,
              <br />
              <span className="text-volt">against your goal.</span>
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Every bar is what you actually ate that day, straight from your logged meals.
              The dashed line is your daily goal, worked out from your profile or set by the
              coach. Green means you landed at or under it, orange means over. See your
              average and your protein over any stretch, so you know if the week held up.
            </p>
          </div>
        </section>

        {/* ── Pillar 4: Progress ───────────────────────────────────── */}
        <section className="mt-20 lg:mt-28">
          <p className="font-score text-[11px] uppercase tracking-[0.18em] text-muted-2">Progress</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight lg:text-[2.75rem] lg:leading-[1.05]">
            The proof shows up in plain language.
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted">
            Volume climbing week over week, bodyweight moving the right way, the streak of
            days you showed up, all read as plain sentences instead of lines on a graph.
            It&apos;s the same history your coach uses to decide what to change next.
          </p>
        </section>

        {/* ── How to use it ────────────────────────────────────────── */}
        <section className="mt-20 lg:mt-28">
          <h2 className="font-display text-2xl font-bold tracking-tight lg:text-4xl">
            How to use it
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-3">
            {[
              ["01", "Set your profile", "Your goal, level, schedule and the gear you have. About a minute, and you can change any of it later."],
              ["02", "Get your plan", "The coach builds 4 to 5 exercises per training day around all of it. Want it different? Just ask in plain words."],
              ["03", "Train and log", "Log your sets and meals as you go. Every entry feeds back, so next week is sharper than this one."],
            ].map(([n, t, d]) => (
              <div key={n} className="border-t border-border-strong pt-4">
                <p className="font-score text-sm font-bold text-volt">{n}</p>
                <p className="mt-3 font-display text-lg font-bold">{t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Trust ────────────────────────────────────────────────── */}
        <section className="mt-16 lg:mt-24">
          <div className="rounded-3xl border border-border bg-surface p-7 lg:p-10">
            <div className="grid gap-6 md:grid-cols-3">
              {[
                ["Sign in without a password", "Use Google or a passkey with Face ID or a fingerprint. Nothing to leak or forget."],
                ["Your data stays yours", "Every account is walled off on its own. No one sees your workouts, meals or chats but you."],
                ["No app store needed", "It's a web app that installs straight to your home screen and opens like any native app."],
              ].map(([t, d]) => (
                <div key={t}>
                  <p className="font-display font-bold">{t}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────── */}
        <section className="mt-20 text-center lg:mt-28">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight lg:text-5xl">
            Set up in a minute.
            <br />
            <span className="text-volt">Get your first plan today.</span>
          </h2>
          <Button asChild size="lg" className="pressable mt-8">
            <Link href="/signup">Create your free account →</Link>
          </Button>
          <p className="font-score mt-4 text-[11px] tracking-wide text-muted-2">
            Free to start · no card required
          </p>
        </section>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <footer className="mt-20 border-t border-border pt-8 text-center lg:mt-28">
          <Logo variant="full" className="justify-center" />
          <p className="mt-4 text-xs text-muted-2">
            GymTrack Pro provides general fitness guidance, not medical advice.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted">
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/data-deletion" className="hover:text-foreground">Data deletion</Link>
            <Link href="/support" className="hover:text-foreground">Support</Link>
            <a href="mailto:soporte@gymtrackpro.xyz" className="hover:text-foreground">soporte@gymtrackpro.xyz</a>
          </div>
          <div className="mt-8 flex flex-col items-center gap-1">
            <p className="text-xs text-muted-2">Designed &amp; developed by Keyvis Cabrera</p>
            <a
              href="https://wa.me/17276159977?text=Hola%20Keyvis%2C%20te%20contacto%20desde%20la%20p%C3%A1gina%20de%20GymTrack%20Pro."
              target="_blank"
              rel="noopener noreferrer"
              className="pressable inline-flex items-center gap-1.5 text-xs font-semibold text-volt hover:underline"
            >
              Contact on WhatsApp
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
