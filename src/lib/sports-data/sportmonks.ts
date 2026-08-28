import type { MatchStatus, SportsDataProvider, SportsFixture } from "./types";

interface SportmonksParticipant {
  id?: number;
  name?: string;
  meta?: { location?: "home" | "away" };
}

interface SportmonksScore {
  score?: { goals?: number };
  description?: string;
  participant?: "home" | "away";
}

interface SportmonksState {
  name?: string;
  short_name?: string;
  developer_name?: string;
}

interface SportmonksFixture {
  id: number;
  league_id?: number;
  league?: { id?: number; name?: string };
  name?: string;
  starting_at?: string;
  state?: SportmonksState;
  participants?: SportmonksParticipant[];
  scores?: SportmonksScore[];
}

interface SportmonksResponse {
  data?: SportmonksFixture | SportmonksFixture[];
}

function requiredToken(): string {
  const token = process.env.SPORTMONKS_API_TOKEN;
  if (!token) throw new Error("SPORTMONKS_API_TOKEN must be set");
  return token;
}

function statusOf(fixture: SportmonksFixture): MatchStatus {
  const state = [
    fixture.state?.name,
    fixture.state?.short_name,
    fixture.state?.developer_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (state.includes("postpon")) return "postponed";
  if (state.includes("cancel")) return "cancelled";
  if (state.includes("finished") || state.includes("full time") || state === "ft") {
    return "finished";
  }
  if (state.includes("live") || state.includes("progress") || state.includes("half time")) {
    return "live";
  }
  return "scheduled";
}

function scoreFor(fixture: SportmonksFixture, participant: "home" | "away"): number | undefined {
  const score = fixture.scores?.find(
    (entry) => entry.participant === participant && entry.description?.toUpperCase() === "CURRENT",
  );
  return score?.score?.goals;
}

function normalize(fixture: SportmonksFixture): SportsFixture {
  const participants = fixture.participants ?? [];
  const home = participants.find((participant) => participant.meta?.location === "home");
  const away = participants.find((participant) => participant.meta?.location === "away");

  return {
    id: fixture.id,
    leagueId: fixture.league_id ?? fixture.league?.id ?? 0,
    leagueName: fixture.league?.name ?? "Unknown league",
    homeTeam: home?.name ?? "Home team",
    awayTeam: away?.name ?? "Away team",
    startDate: fixture.starting_at ? new Date(fixture.starting_at).toISOString() : new Date(0).toISOString(),
    status: statusOf(fixture),
    homeScore: scoreFor(fixture, "home"),
    awayScore: scoreFor(fixture, "away"),
    provider: "sportmonks",
  };
}

export class SportmonksProvider implements SportsDataProvider {
  private readonly baseUrl = "https://api.sportmonks.com/v3/football";

  private async request(path: string): Promise<SportmonksFixture[]> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${requiredToken()}` },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Sportmonks ${response.status}: ${body}`);
    }

    const payload = (await response.json()) as SportmonksResponse;
    const fixtures = Array.isArray(payload.data) ? payload.data : payload.data ? [payload.data] : [];
    return fixtures;
  }

  async getFixtures(from: Date, to: Date, leagueId?: number): Promise<SportsFixture[]> {
    const start = from.toISOString().slice(0, 10);
    const end = to.toISOString().slice(0, 10);
    const fixtures = await this.request(`/fixtures/between/${start}/${end}?include=participants;scores;state;league`);
    return fixtures
      .map(normalize)
      .filter((fixture) => leagueId === undefined || fixture.leagueId === leagueId);
  }

  async getFixtureById(fixtureId: number): Promise<SportsFixture | null> {
    const fixtures = await this.request(`/fixtures/${fixtureId}?include=participants;scores;state;league`);
    return fixtures[0] ? normalize(fixtures[0]) : null;
  }

  async getLiveMatches(leagueId?: number): Promise<SportsFixture[]> {
    const fixtures = await this.request("/livescores?include=participants;scores;state;league");
    return fixtures
      .map(normalize)
      .filter((fixture) => leagueId === undefined || fixture.leagueId === leagueId);
  }

  async getFinalResult(fixtureId: number): Promise<SportsFixture | null> {
    const fixture = await this.getFixtureById(fixtureId);
    return fixture?.status === "finished" ? fixture : null;
  }
}
