"use client";

import { useEffect, useState } from "react";
import { FixtureCard } from "@/components/fixtures/FixtureCard";

interface Fixture {
  id: number;
  homeTeam: string;
  awayTeam: string;
  startDate: string;
  status: string;
  competition: string;
  homeScore?: number;
  awayScore?: number;
  minute?: string;
}

const FILTERS = ["All", "Live", "Upcoming", "Finished"] as const;
type Filter = (typeof FILTERS)[number];

export default function FixturesPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("All");

  useEffect(() => {
    fetch("/api/txline/fixtures")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setFixtures(data);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const live = fixtures.filter((f) => f.status === "live");
  const upcoming = fixtures.filter((f) => f.status === "upcoming" || f.status === "scheduled");
  const finished = fixtures.filter((f) => f.status === "finished");

  const filtered =
    filter === "All"
      ? fixtures
      : filter === "Live"
        ? live
        : filter === "Upcoming"
          ? upcoming
          : finished;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-accent border-t-transparent" />
          <span className="text-sm text-zinc-500">Loading fixtures...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="glass-strong mb-4 rounded-xl p-6">
          <p className="text-sm text-red-400">{error}</p>
          <p className="mt-2 text-xs text-zinc-500">
             Make sure SPORTMONKS_API_TOKEN is set in your .env
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div>
        <span className="section-header">Live Leagues</span>
        <h1 className="text-2xl font-bold">Fixtures</h1>
        <p className="mt-1 text-sm text-zinc-500">
           Premier League and La Liga fixtures powered by football-data.org
        </p>
      </div>

      {/* Featured live match */}
      {live.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Live Now
            </span>
          </div>
          <FixtureCard fixture={live[0]} variant="hero" />
        </section>
      )}

      {/* Filters */}
      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-white/10 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Fixture grid */}
      {filter !== "All" && filtered.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-white/10 py-16">
          <p className="text-sm text-zinc-500">
            No {filter.toLowerCase()} fixtures at the moment
          </p>
        </div>
      ) : filter === "All" ? (
        <div className="flex flex-col gap-8">
          {live.length > 0 && (
            <div>
              <span className="section-header mb-3 block">Live</span>
              <div className="grid gap-2">
                {live.map((f) => (
                  <FixtureCard key={f.id} fixture={f} />
                ))}
              </div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <span className="section-header mb-3 block">Upcoming</span>
              <div className="grid gap-2">
                {upcoming.map((f) => (
                  <FixtureCard key={f.id} fixture={f} />
                ))}
              </div>
            </div>
          )}
          {finished.length > 0 && (
            <div>
              <span className="section-header mb-3 block">Finished</span>
              <div className="grid gap-2">
                {finished.map((f) => (
                  <FixtureCard key={f.id} fixture={f} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((f) => (
            <FixtureCard key={f.id} fixture={f} />
          ))}
        </div>
      )}
    </div>
  );
}
