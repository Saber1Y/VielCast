export type MatchStatus = "scheduled" | "live" | "finished" | "postponed" | "cancelled";

export interface SportsFixture {
  id: number;
  leagueId: number;
  leagueName: string;
  homeTeam: string;
  awayTeam: string;
  homeCrest?: string;
  awayCrest?: string;
  startDate: string;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  provider: string;
}

export interface SportsDataProvider {
  getFixtures(from: Date, to: Date, leagueId?: number): Promise<SportsFixture[]>;
  getFixtureById(fixtureId: number): Promise<SportsFixture | null>;
  getLiveMatches(leagueId?: number): Promise<SportsFixture[]>;
  getFinalResult(fixtureId: number): Promise<SportsFixture | null>;
}
