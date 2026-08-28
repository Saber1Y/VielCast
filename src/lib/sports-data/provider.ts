import { SportmonksProvider } from "./sportmonks";
import type { SportsDataProvider } from "./types";

let provider: SportsDataProvider | null = null;

export function getSportsDataProvider(): SportsDataProvider {
  if (!provider) provider = new SportmonksProvider();
  return provider;
}
