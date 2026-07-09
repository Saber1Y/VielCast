import Link from "next/link";
import { FixtureCard } from "@/components/fixtures/FixtureCard";
import { ensureTxLINEInit } from "@/lib/txline/server-init";
import { getFixtures } from "@/lib/txline/client";

const LIVE_WINDOW_MS = 4 * 60 * 60 * 1000;
const MATCH_DURATION_BUFFER = 3 * 60 * 60 * 1000;

async function getLiveFixtures() {
  try {
    ensureTxLINEInit();
    const fixtures = await getFixtures();
    const now = Date.now();
    return fixtures
      .map((f) => {
        const startDate = new Date(f.startDate).getTime();
        const elapsed = now - startDate;
        if (elapsed < 0) return null;
        if (elapsed >= LIVE_WINDOW_MS) return null;
        if (elapsed >= MATCH_DURATION_BUFFER) return null;
        return { ...f, status: "live" as const, homeScore: 0, awayScore: 0 };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);
  } catch {
    return [];
  }
}

export default async function Home() {
  const liveFixtures = await getLiveFixtures();

  return (
    <div className="flex flex-col gap-16 pb-20">
      {/* Hero */}
      <section className="flex flex-col items-center gap-10 pt-12 text-center lg:flex-row lg:text-left">
        <div className="flex-1">
          <span className="section-header mb-3 block">ProofPlay World Cup</span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
            Create World Cup prediction rooms that settle with{" "}
            <span className="text-gradient">verifiable sports data</span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-400 lg:text-base">
            ProofPlay Markets uses TxLINE&apos;s real-time World Cup feeds and
            Solana-verifiable result proofs to resolve fan prediction rooms
            transparently. No admin override. No guessing.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href="/fixtures"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-accent px-6 py-3 text-sm font-semibold text-pitch transition-all hover:bg-green-accent/90"
            >
              Explore Fixtures
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 3l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-6 py-3 text-sm font-medium text-zinc-300 transition-all hover:bg-white/5"
            >
              Documentation
            </Link>
          </div>
        </div>
        <div className="flex-1">
          {liveFixtures[0] ? (
            <FixtureCard fixture={liveFixtures[0]} variant="hero" />
          ) : (
            <div className="glass-card flex items-center justify-center p-12 text-center">
              <div>
                <p className="text-sm text-zinc-500">
                  No live matches right now
                </p>
                <Link
                  href="/fixtures"
                  className="mt-2 inline-block text-xs font-medium text-cyan-accent hover:text-cyan-300"
                >
                  Browse fixtures →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section>
        <div className="mb-8 text-center">
          <h2 className="text-xl font-bold">How it works</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Pick a Match",
              desc: "Choose any World Cup fixture from the TxLINE data feed.",
              icon: (
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none">
                  <circle
                    cx="10"
                    cy="10"
                    r="8.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M6 10l2.5 2.5L14 7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ),
            },
            {
              step: "02",
              title: "Create a Room",
              desc: "Set your prediction rule, entry stake, and invite friends.",
              icon: (
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none">
                  <rect
                    x="2"
                    y="3"
                    width="16"
                    height="14"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M6 8h8M6 12h5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              ),
            },
            {
              step: "03",
              title: "Verified Settlement",
              desc: "TxLINE data resolves the room. The proof is anchored on Solana.",
              icon: (
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 2l2.5 5.5L18 8.5l-4 4 1 5.5L10 15l-5 3 1-5.5-4-4 5.5-1L10 2z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              ),
            },
          ].map((item) => (
            <div
              key={item.step}
              className="glass-card flex flex-col items-center gap-3 p-6 text-center"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-accent/10 text-green-accent">
                {item.icon}
              </div>
              <div>
                <div className="text-[10px] font-mono text-zinc-600">
                  {item.step}
                </div>
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-accent hover:text-cyan-300 transition-colors"
          >
            Read the technical docs
            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </section>

      {/* Live Fixtures */}
      <section>
        <div className="mb-4">
          <span className="section-header">Featured</span>
          <h2 className="text-xl font-bold">Live Fixtures</h2>
        </div>
        {liveFixtures.length > 0 ? (
          <div className="grid gap-3">
            {liveFixtures.map((f) => (
              <FixtureCard key={f.id} fixture={f} variant="default" />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-white/10 px-6 py-16 text-center">
            <div>
              <p className="text-sm text-zinc-500">No live matches right now</p>
              <Link
                href="/fixtures"
                className="mt-3 inline-block text-sm font-medium text-cyan-accent hover:text-cyan-300"
              >
                View all fixtures →
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
