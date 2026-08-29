import type { MatchStatus, SportsDataProvider, SportsFixture } from "./types";

type FootballDataStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "POSTPONED"
  | "SUSPENDED"
  | "CANCELLED";

interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: FootballDataStatus;
  competition?: { id?: number; name?: string; code?: string };
  homeTeam?: { name?: string; crest?: string };
  awayTeam?: { name?: string; crest?: string };
  score?: {
    fullTime?: { home?: number | null; away?: number | null };
  };
}

interface FootballDataResponse {
  matches?: FootballDataMatch[];
}

const COMPETITIONS = new Set(["PL", "PD"]);
const COMPETITION_CODES = Array.from(COMPETITIONS);
const COMPETITION_NAMES: Record<string, string> = {
  PL: "Premier League",
  PD: "La Liga",
};

function requiredToken(): string {
  const token = process.env.FOOTBALL_DATA_API_TOKEN;
  if (!token) throw new Error("FOOTBALL_DATA_API_TOKEN must be set");
  return token;
}

function statusOf(status: FootballDataStatus): MatchStatus {
  if (status === "IN_PLAY" || status === "PAUSED") return "live";
  if (status === "FINISHED") return "finished";
  if (status === "POSTPONED" || status === "SUSPENDED" || status === "CANCELLED") {
    return status === "CANCELLED" ? "cancelled" : "postponed";
  }
  return "scheduled";
}

function normalize(match: FootballDataMatch): SportsFixture {
  const code = match.competition?.code ?? "";
  const score = match.score?.fullTime;
  return {
    id: match.id,
    leagueId: match.competition?.id ?? 0,
    leagueName: COMPETITION_NAMES[code] ?? match.competition?.name ?? "Unknown league",
    homeTeam: match.homeTeam?.name ?? "Home team",
    awayTeam: match.awayTeam?.name ?? "Away team",
    homeCrest: match.homeTeam?.crest,
    awayCrest: match.awayTeam?.crest,
    startDate: new Date(match.utcDate).toISOString(),
    status: statusOf(match.status),
    homeScore: score?.home ?? undefined,
    awayScore: score?.away ?? undefined,
    provider: "football-data.org",
  };
}

export class FootballDataProvider implements SportsDataProvider {
  private readonly baseUrl = "https://api.football-data.org/v4";

  private async request(path: string): Promise<FootballDataMatch[]> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { "X-Auth-Token": requiredToken() },
      cache: "no-store",
    });

    const remaining = response.headers.get("x-requests-available-minute");
    if (remaining) console.info(`[football-data.org] requests remaining this minute: ${remaining}`);

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`football-data.org ${response.status}: ${body}`);
    }

    const payload = (await response.json()) as FootballDataResponse | FootballDataMatch;
    if ("matches" in payload) return payload.matches ?? [];
    return "id" in payload ? [payload] : [];
  }

  async getFixtures(from: Date, to: Date, leagueId?: number): Promise<SportsFixture[]> {
    const start = from.toISOString().slice(0, 10);
    const end = to.toISOString().slice(0, 10);
    const matches = (await Promise.all(
      COMPETITION_CODES.map((code) =>
        this.request(`/competitions/${code}/matches?dateFrom=${start}&dateTo=${end}`),
      ),
    )).flat();
    return matches
      .map(normalize)
      .filter((fixture) => leagueId === undefined || fixture.leagueId === leagueId);
  }

  async getFixtureById(fixtureId: number): Promise<SportsFixture | null> {
    const matches = await this.request(`/matches/${fixtureId}`);
    const fixture = matches[0] ? normalize(matches[0]) : null;
    return fixture && COMPETITIONS.has(matches[0]?.competition?.code ?? "") ? fixture : null;
  }

  async getLiveMatches(leagueId?: number): Promise<SportsFixture[]> {
    const matches = (await Promise.all(
      COMPETITION_CODES.map((code) =>
        this.request(`/competitions/${code}/matches?status=IN_PLAY,PAUSED`),
      ),
    )).flat();
    return matches
      .map(normalize)
      .filter((fixture) => leagueId === undefined || fixture.leagueId === leagueId);
  }

  async getFinalResult(fixtureId: number): Promise<SportsFixture | null> {
    const fixture = await this.getFixtureById(fixtureId);
    return fixture?.status === "finished" ? fixture : null;
  }
}
