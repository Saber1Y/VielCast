"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

const sections = [
  {
    id: "overview",
    title: "Overview",
    content: (
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-zinc-400">
          ProofPlay Markets is a verifiable prediction market dApp for World Cup matches.
          Users create rooms, pick a side, stake SOL, and earn payouts when the match
          ends — all verified through <span className="text-cyan-accent">TxLINE</span>'s
          real-time sports data oracle with settlement receipts anchored on
          <span className="text-green-accent"> Solana Devnet</span>.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Market Types", value: "Winner Pick + Goal Rush" },
            { label: "Settlement", value: "TxLINE Merkle Proofs" },
            { label: "Network", value: "Solana Devnet" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-white/[0.03] px-3 py-2.5">
              <div className="text-[10px] font-mono text-zinc-600">{s.label}</div>
              <div className="mt-0.5 text-sm font-medium text-zinc-200">{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "architecture",
    title: "Architecture",
    content: (
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-zinc-400">
          The system uses Next.js 15 API routes as the backend, with an Anchor program on Solana
          for on-chain market state. TxLINE provides real-time match data and Merkle-verified results.
        </p>

        {/* Flow diagram */}
        <div className="overflow-x-auto">
          <div className="flex min-w-[600px] items-center justify-center gap-0 py-4">
            {[
              { label: "User\n(Frontend)", color: "text-green-accent border-green-accent/40" },
              { label: "Next.js\nAPI Routes", color: "text-cyan-accent border-cyan-accent/40" },
              { label: "Anchor\nProgram", color: "text-amber-400 border-amber-400/40" },
              { label: "TxLINE\nOracle", color: "text-purple-400 border-purple-400/40" },
            ].map((node, i) => (
              <div key={i} className="flex items-center gap-0">
                <div className={`flex h-20 w-24 items-center justify-center rounded-xl border ${node.color} bg-black/20 px-2 text-center`}>
                  <span className="text-[10px] font-medium leading-tight whitespace-pre-line">{node.label}</span>
                </div>
                {i < 3 && (
                  <div className="flex items-center px-2">
                    <svg className="h-4 w-8 text-zinc-600" viewBox="0 0 32 16" fill="none">
                      <path d="M2 8h24M20 2l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <GlassCard className="p-4" hover={false}>
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Frontend</span>
            <ul className="mt-2 flex flex-col gap-1.5 text-xs text-zinc-400">
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-green-accent/60" />
                Next.js 15 App Router (React 19)
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-green-accent/60" />
                Privy wallet auth (Solana)
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-green-accent/60" />
                Tailwind CSS v4, glass UI
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-green-accent/60" />
                Phantom wallet integration
              </li>
            </ul>
          </GlassCard>
          <GlassCard className="p-4" hover={false}>
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Backend</span>
            <ul className="mt-2 flex flex-col gap-1.5 text-xs text-zinc-400">
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-cyan-accent/60" />
                Next.js API routes (serverless)
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-cyan-accent/60" />
                Vercel KV for room persistence
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-cyan-accent/60" />
                Anchor + @coral-xyz/anchor SDK
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-cyan-accent/60" />
                TxLINE REST + SSE client
              </li>
            </ul>
          </GlassCard>
        </div>
      </div>
    ),
  },
  {
    id: "smart-contract",
    title: "Smart Contract",
    content: (
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-zinc-400">
          The Anchor program manages prediction markets on-chain. Each fixture has one
          market PDA. Participants join via a derived participant PDA.
        </p>

        <div className="overflow-x-auto rounded-lg border border-white/5 bg-black/20 p-4">
          <pre className="text-xs leading-relaxed text-zinc-300"><span className="text-zinc-600">// Program ID</span>
<span className="text-cyan-accent">D254EggCVsZ7jKtJJ29diEv3P4qqjn5APBAvcRwDNsyE</span>

<span className="text-zinc-600">// Market PDA seeds</span>
<span className="text-purple-400">[b"market", creator, fixtureId_le]</span>

<span className="text-zinc-600">// Participant PDA seeds</span>
<span className="text-purple-400">[b"participant", market, wallet]</span></pre>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-white/[0.03] p-4">
            <span className="text-xs font-semibold text-amber-400">Instructions</span>
            <ul className="mt-2 flex flex-col gap-1.5 text-xs text-zinc-400">
              <li><span className="text-zinc-500">initializeMarket</span> — Create a new market PDA</li>
              <li><span className="text-zinc-500">joinMarket</span> — Join with stake, creates participant PDA</li>
              <li><span className="text-zinc-500">lockMarket</span> — Lock before kickoff</li>
              <li><span className="text-zinc-500">settleMarket</span> — Settle with winner + merkle root</li>
              <li><span className="text-zinc-500">claimPayout</span> — Winner claims SOL from pool</li>
            </ul>
          </div>
          <div className="rounded-lg bg-white/[0.03] p-4">
            <span className="text-xs font-semibold text-amber-400">Accounts</span>
            <ul className="mt-2 flex flex-col gap-1.5 text-xs text-zinc-400">
              <li><span className="text-zinc-500">Market</span> — Fixture ID, market type, threshold, status, participants, total stake</li>
              <li><span className="text-zinc-500">Participant</span> — Wallet, side, amount, claimed flag</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "api",
    title: "API Reference",
    content: (
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-zinc-400">
          All room management is handled through Next.js API routes under <code className="text-cyan-accent text-xs">/api/rooms</code>.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 text-left">
                <th className="pb-2 font-medium text-zinc-500">Route</th>
                <th className="pb-2 font-medium text-zinc-500">Method</th>
                <th className="pb-2 font-medium text-zinc-500">Description</th>
              </tr>
            </thead>
            <tbody className="text-zinc-400">
              {[
                ["/api/rooms", "POST", "Create a new prediction room"],
                ["/api/rooms", "GET", "List all rooms"],
                ["/api/rooms/[id]", "GET", "Get room details"],
                ["/api/rooms/[id]/join", "POST", "Join a room"],
                ["/api/rooms/[id]/lock", "POST", "Lock room at kickoff"],
                ["/api/rooms/[id]/settle", "POST", "Settle with TxLINE proof"],
                ["/api/rooms/[id]/claim", "POST", "Build claim transaction"],
                ["/api/rooms/[id]/claim/submit", "POST", "Submit payout"],
                ["/api/rooms/[id]/receipt", "GET", "Get settlement receipt"],
                ["/api/txline/fixtures", "GET", "List all fixtures"],
                ["/api/txline/scores/[id]", "GET", "Get score snapshot"],
                ["/api/txline/stream", "GET", "SSE score stream"],
              ].map(([route, method, desc]) => (
                <tr key={route} className="border-b border-white/[0.02]">
                  <td className="py-2 pr-4 font-mono text-zinc-300">{route}</td>
                  <td className="py-2 pr-4">
                    <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-medium ${
                      method === "GET" ? "bg-green-accent/10 text-green-accent" : "bg-cyan-accent/10 text-cyan-accent"
                    }`}>{method}</span>
                  </td>
                  <td className="py-2">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ),
  },
  {
    id: "txline",
    title: "TxLINE Integration",
    content: (
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-zinc-400">
          TxLINE is the real-time sports data oracle. All match data — scores, status, stats —
          flows through TxLINE's API with Merkle-tree based verification for on-chain settlement.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <GlassCard className="p-4" hover={false}>
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Auth</span>
            <div className="mt-2 flex flex-col gap-1.5 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-purple-400/60" />
                JWT in <code className="text-purple-400">Authorization: Bearer</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-purple-400/60" />
                API token in <code className="text-purple-400">X-Api-Token</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-purple-400/60" />
                Expires after 30 days
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4" hover={false}>
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Status Mapping</span>
            <div className="mt-2 flex flex-col gap-1.5 text-xs text-zinc-400">
              <div><span className="text-zinc-500">StatusId 5/7/9</span> → finished (full time / extra time / penalties)</div>
              <div><span className="text-zinc-500">StatusId 2/3/4</span> → in_progress</div>
              <div><span className="text-zinc-500">StatusId 1</span> → scheduled</div>
            </div>
          </GlassCard>
        </div>
        <div className="rounded-lg border border-white/5 bg-black/20 p-4">
          <span className="text-xs font-semibold text-purple-400">Score Snapshot Response</span>
          <pre className="mt-2 text-xs leading-relaxed text-zinc-400">{
`[
  {
    "FixtureId": 123,
    "Seq": 42,
    "StatusId": 5,
    "Score": {
      "Participant1": { "Total": { "Goals": 2 } },
      "Participant2": { "Total": { "Goals": 1 } }
    },
    "Clock": { "Seconds": 5580 }
  }
]`}</pre>
        </div>
      </div>
    ),
  },
  {
    id: "settlement",
    title: "Settlement Flow",
    content: (
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-zinc-400">
          Settlement is triggered by the room creator after the match ends. The system
          fetches the final score from TxLINE, validates it with a Merkle proof, and
          records the result.
        </p>
        <div className="flex flex-col gap-2">
          {[
            { step: "1", title: "Fetch Score", desc: "GET /api/scores/snapshot/{fixtureId} — retrieves the latest score event with StatusId 5/7/9 (finished)" },
            { step: "2", title: "Determine Winner", desc: "Goal Rush: total goals vs threshold | Winner Pick: HOME/AWAY/DRAW based on scores" },
            { step: "3", title: "Stat Validation", desc: "POST /api/scores/stat-validation — requests a Merkle proof for the winning stat" },
            { step: "4", title: "On-Chain Settle", desc: "Calls settleMarket on the Anchor program with the winner side + merkle root" },
            { step: "5", title: "Generate Receipt", desc: "Stores the full settlement receipt: score, validation, merkle root, payout summary" },
            { step: "6", title: "Claim Payout", desc: "Winner signs a claim transaction → server sends SOL from the pool to their wallet" },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-3 rounded-lg bg-white/[0.02] px-4 py-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-accent/10 text-[10px] font-mono font-bold text-green-accent">
                {s.step}
              </div>
              <div>
                <span className="text-xs font-semibold text-zinc-200">{s.title}</span>
                <p className="mt-0.5 text-xs text-zinc-500">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "quickstart",
    title: "Quick Start",
    content: (
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-zinc-400">
          Run the project locally to explore the full flow.
        </p>
        <div className="rounded-lg border border-white/5 bg-black/20 p-4">
          <pre className="text-xs leading-relaxed text-zinc-300">
<span className="text-zinc-600"># 1. Clone and install</span>
git clone https://github.com/Saber1Y/ProofPlayMarkets
cd ProofPlayMarkets
npm install --legacy-peer-deps

<span className="text-zinc-600"># 2. Set up environment</span>
cp .env.example .env
<span className="text-zinc-600"># Add TXLINE_JWT, TXLINE_API_TOKEN, NEXT_PUBLIC_PRIVY_APP_ID</span>

<span className="text-zinc-600"># 3. Run locally (SSL workaround for expired devnet cert)</span>
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev

<span className="text-zinc-600"># 4. Open http://localhost:3000</span></pre>
        </div>
        <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 px-4 py-3">
          <span className="text-xs font-medium text-amber-400">Prerequisites</span>
          <ul className="mt-1.5 flex flex-col gap-1 text-xs text-zinc-500">
            <li>• Node.js 18+</li>
            <li>• Phantom wallet (Solana devnet)</li>
            <li>• Devnet SOL from <a href="https://faucet.solana.com" target="_blank" className="text-cyan-accent hover:underline">faucet.solana.com</a></li>
            <li>• TxLINE API credentials</li>
          </ul>
        </div>
      </div>
    ),
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState(sections[0].id);

  return (
    <div className="mx-auto flex max-w-5xl gap-8">
      {/* Sidebar */}
      <aside className="hidden w-48 shrink-0 md:block">
        <nav className="sticky top-20 flex flex-col gap-1">
          <span className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
            Contents
          </span>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setActiveSection(s.id);
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`text-left text-xs transition-colors ${
                activeSection === s.id
                  ? "text-green-accent font-medium"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {s.title}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-8">
          <span className="section-header">Docs</span>
          <h1 className="text-2xl font-bold">Technical Documentation</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Architecture, integration guides, and API reference for ProofPlay Markets
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {sections.map((s) => (
            <GlassCard key={s.id} id={s.id} className="scroll-mt-20 p-6" hover={false}>
              <span className="section-header mb-4 block">{s.title}</span>
              {s.content}
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
