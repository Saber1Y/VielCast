import { FootballDataProvider } from "./football-data";
import type { SportsDataProvider } from "./types";

let provider: SportsDataProvider | null = null;

export function getSportsDataProvider(): SportsDataProvider {
  if (!provider) provider = new FootballDataProvider();
  return provider;
}
