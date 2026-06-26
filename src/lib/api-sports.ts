import { getEnvStore } from "@/lib/env-store";

const BASE = "https://v3.football.api-sports.io";

// Maps our competition names (as stored in `groups.competition`) to API-Sports league IDs.
export const API_SPORTS_LEAGUE_IDS: Record<string, number> = {
  "Premier League": 39,
  "La Liga": 140,
  "Bundesliga": 78,
  "Serie A": 135,
  "Ligue 1": 61,
  "Eredivisie": 88,
  "Primeira Liga": 94,
  "Championship": 40,
  "UEFA Champions League": 2,
  "UEFA Europa League": 3,
  "UEFA Conference League": 848,
  "Copa del Rey": 143,
  "DFB Pokal": 81,
  "Coppa Italia": 137,
};

async function get<T>(path: string): Promise<T> {
  const key = getEnvStore().API_SPORTS_KEY;
  if (!key) throw new Error("API_SPORTS_KEY is not configured.");

  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-apisports-key": key },
  });
  if (!res.ok) throw new Error(`API-Sports ${res.status}: ${await res.text().catch(() => res.statusText)}`);

  const json = await res.json() as { response: T; errors: unknown };
  const errors = json.errors;
  if (errors && typeof errors === "object" && Object.keys(errors as object).length > 0) {
    throw new Error(`API-Sports error: ${JSON.stringify(errors)}`);
  }
  return json.response;
}

export type ApiSportsTeamEntry = {
  team: { id: number; name: string; code: string | null; logo: string | null };
  venue: { name: string | null; city: string | null; capacity: number | null };
};

export type ApiSportsPlayer = {
  id: number;
  name: string;
  age: number | null;
  number: number | null;
  position: string;  // "Goalkeeper" | "Defender" | "Midfielder" | "Attacker"
  photo: string | null;
  nationality: string | null;
};

/** All teams in a league for a given season year (e.g. 2024 for 2024/25). */
export async function fetchLeagueTeams(leagueId: number, season: number): Promise<ApiSportsTeamEntry[]> {
  return get<ApiSportsTeamEntry[]>(`/teams?league=${leagueId}&season=${season}`);
}

/** Current squad for a team by their API-Sports team ID. */
export async function fetchTeamSquad(teamId: number): Promise<ApiSportsPlayer[]> {
  const rows = await get<{ team: { id: number }; players: ApiSportsPlayer[] }[]>(
    `/players/squads?team=${teamId}`,
  );
  return rows[0]?.players ?? [];
}

/** Map API-Sports position string to the format we use in the squad JSON. */
export function mapPosition(pos: string): string {
  switch (pos) {
    case "Goalkeeper": return "Goalkeeper";
    case "Defender":   return "Defence";
    case "Midfielder": return "Midfield";
    case "Attacker":   return "Offence";
    default:           return pos;
  }
}

/** Return the current football season year (e.g. 2024 for 2024/25 or 2025/26). */
export function currentSeason(): number {
  const d = new Date();
  // Seasons start in July/August
  return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
}
