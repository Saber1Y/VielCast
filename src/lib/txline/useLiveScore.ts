"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface LiveScoreState {
  homeScore: number;
  awayScore: number;
  seq: number;
  status: string;
  period?: string;
}

interface ScoreStreamEvent {
  seq: number;
  status: string;
  home_score: number;
  away_score: number;
}

function parseScoreEvent(e: ScoreStreamEvent): LiveScoreState | null {
  if (e.home_score == null || e.away_score == null) return null;
  return {
    homeScore: e.home_score,
    awayScore: e.away_score,
    seq: e.seq,
    status: e.status,
  };
}

export function useLiveScore(fixtureId: number, initial?: { homeScore: number; awayScore: number }) {
  const [score, setScore] = useState<LiveScoreState | null>(null);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const connectSSE = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    const es = new EventSource(`/api/txline/stream?fixtureId=${fixtureId}`);
    esRef.current = es;
    es.onopen = () => setConnected(true);
    es.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        const items = Array.isArray(raw) ? raw : [raw];
        for (const item of items) {
          const parsed = parseScoreEvent(item as ScoreStreamEvent);
          if (parsed) {
            setScore((prev) => (prev && prev.seq >= parsed.seq ? prev : parsed));
          }
        }
      } catch {
        // skip malformed
      }
    };
    es.onerror = () => setConnected(false);
  }, [fixtureId]);

  useEffect(() => {
    if (fixtureId <= 0) return;
    setScore(null);
    setConnected(false);
    fetch(`/api/txline/scores/${fixtureId}`)
      .then((r) => r.json())
      .then((data) => {
        const s = data.snapshot;
        if (s?.home_score != null) {
          setScore({
            homeScore: s.home_score,
            awayScore: s.away_score,
            seq: s.seq,
            status: s.status,
            period: s.period,
          });
        }
      })
      .catch(() => {});
    connectSSE();
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      setConnected(false);
    };
  }, [fixtureId, connectSSE]);

  const refresh = useCallback(() => {
    setScore(null);
    setConnected(false);
    fetch(`/api/txline/scores/${fixtureId}`)
      .then((r) => r.json())
      .then((data) => {
        const s = data.snapshot;
        if (s?.home_score != null) {
          setScore({
            homeScore: s.home_score,
            awayScore: s.away_score,
            seq: s.seq,
            status: s.status,
            period: s.period,
          });
        }
      })
      .catch(() => {});
    connectSSE();
  }, [fixtureId, connectSSE]);

  const homeScore = score?.homeScore ?? initial?.homeScore;
  const awayScore = score?.awayScore ?? initial?.awayScore;

  return { score, connected, refresh, homeScore, awayScore };
}
