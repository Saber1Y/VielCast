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
          VeilCast is a private prediction market dApp for Premier League and La Liga matches.
          Users create rooms, commit a side privately, and claim when the final result is
          resolved on <span className="text-green-accent">Midnight Preprod</span>.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Market Types", value: "Winner Pick + Goal Rush" },
            { label: "Settlement", value: "Midnight ZK Resolution" },
            { label: "Network", value: "Midnight Preprod" },
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
          The system uses Next.js 15 API routes for room records and a Midnight Compact contract
          for private position commitments, creator-authorized resolution, and winner claims.
        </p>

        {/* Flow diagram */}
        <div className="overflow-x-auto">
          <div className="flex min-w-[600px] items-center justify-center gap-0 py-4">
            {[
              { label: "User\n(Frontend)", color: "text-green-accent border-green-accent/40" },
              { label: "Next.js\nAPI Routes", color: "text-cyan-accent border-cyan-accent/40" },
              { label: "Midnight\nContract", color: "text-amber-400 border-amber-400/40" },
              { label: "Football Data\nResult", color: "text-purple-400 border-purple-400/40" },
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
                Lace wallet connector (Midnight)
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-green-accent/60" />
                Tailwind CSS v4, glass UI
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-green-accent/60" />
                Private position commitments
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
                Midnight Compact contract + Lace connector
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-cyan-accent/60" />
                football-data.org REST client
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
          The Midnight Compact contract manages prediction markets on-chain. Positions are
          submitted as private commitments and revealed only when a winner claims.
        </p>

        <div className="overflow-x-auto rounded-lg border border-white/5 bg-black/20 p-4">
          <pre className="text-xs leading-relaxed text-zinc-300"><span className="text-zinc-600">// Contract</span>
<span className="text-cyan-accent">contracts/veilcast-market.compact</span>

<span className="text-zinc-600">// Public state</span>
<span className="text-purple-400">market_id, deadline, locked, outcome, result_hash</span>

<span className="text-zinc-600">// Private witness state</span>
<span className="text-purple-400">position(side, stake, salt), resolverSecret</span></pre>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-white/[0.03] p-4">
            <span className="text-xs font-semibold text-amber-400">Instructions</span>
            <ul className="mt-2 flex flex-col gap-1.5 text-xs text-zinc-400">
               <li><span className="text-zinc-500">deploy</span> - Create a private market contract</li>
               <li><span className="text-zinc-500">submitPosition</span> - Submit a hidden position commitment</li>
               <li><span className="text-zinc-500">lockMarket</span> - Creator locks the market</li>
               <li><span className="text-zinc-500">resolveMarket</span> - Creator anchors the final result</li>
               <li><span className="text-zinc-500">claim</span> - Winner proves the private position with a nullifier</li>
            </ul>
          </div>
          <div className="rounded-lg bg-white/[0.03] p-4">
            <span className="text-xs font-semibold text-amber-400">Accounts</span>
            <ul className="mt-2 flex flex-col gap-1.5 text-xs text-zinc-400">
               <li><span className="text-zinc-500">Market</span> - Public market metadata and commitment set</li>
               <li><span className="text-zinc-500">Participant</span> - Server-side display record; side remains private on-chain</li>
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
                 ["/api/rooms/[id]/settle", "POST", "Fetch result or record Midnight resolution"],
                 ["/api/rooms/[id]/claim", "POST", "Record a completed Midnight claim"],
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
          football-data.org provides the final sports result. VeilCast stores a SHA-256 result anchor
          in the Midnight market when the creator resolves it.
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
          fetches the final score from football-data.org, the creator resolves the Midnight contract,
          and the server records the receipt after the client reports completion.
        </p>
        <div className="flex flex-col gap-2">
          {[
             { step: "1", title: "Fetch Score", desc: "The server retrieves the final football-data.org score for the fixture" },
            { step: "2", title: "Determine Winner", desc: "Goal Rush: total goals vs threshold | Winner Pick: HOME/AWAY/DRAW based on scores" },
             { step: "3", title: "Resolve Result", desc: "The creator calls resolveMarket on Midnight with the outcome and result hash" },
             { step: "4", title: "Generate Receipt", desc: "The server records the final score, result anchor, and payout summary" },
             { step: "5", title: "Claim Privately", desc: "The winner calls claim with their private position and a one-time nullifier" },
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
<span className="text-zinc-600"># Add SPORTMONKS_API_TOKEN</span>

<span className="text-zinc-600"># 3. Run locally</span>
npm run dev

<span className="text-zinc-600"># 4. Open http://localhost:3000</span></pre>
        </div>
        <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 px-4 py-3">
          <span className="text-xs font-medium text-amber-400">Prerequisites</span>
          <ul className="mt-1.5 flex flex-col gap-1 text-xs text-zinc-500">
            <li>• Node.js 20+</li>
            <li>• Lace wallet 4.x on Midnight Preprod</li>
            <li>• Midnight Preprod test funds</li>
            <li>• football-data.org API token</li>
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
