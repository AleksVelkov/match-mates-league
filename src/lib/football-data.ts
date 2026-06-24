import { getEnvStore } from "./env-store";

const BASE_URL = "https://api.football-data.org/v4";

// Map friendly competition names → football-data.org competition codes
export const COMPETITION_CODES: Record<string, string> = {
  "Premier League": "PL",
  "Champions League": "CL",
  "Europa League": "EL",
  "Conference League": "ECSL",
  "La Liga": "PD",
  "Bundesliga": "BL1",
  "Serie A": "SA",
  "Ligue 1": "FL1",
  "Eredivisie": "DED",
  "Primeira Liga": "PPL",
  "Championship": "ELC",
};

export type FDMatch = {
  id: number;
  matchday: number;
  utcDate: string;
  status: "SCHEDULED" | "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "POSTPONED" | "CANCELLED";
  homeTeam: { id: number; name: string; shortName: string; tla: string };
  awayTeam: { id: number; name: string; shortName: string; tla: string };
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime: { home: number | null; away: number | null };
  };
};

export type FDMatchesResponse = {
  matches: FDMatch[];
  resultSet?: { count: number; competitions: string; first: string; last: string; played: number };
};

async function fdFetch<T>(path: string): Promise<T> {
  const env = getEnvStore();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": env.FOOTBALL_DATA_API_KEY },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`football-data.org ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchMatchday(competitionCode: string, matchday: number): Promise<FDMatch[]> {
  const data = await fdFetch<FDMatchesResponse>(
    `/competitions/${competitionCode}/matches?matchday=${matchday}`
  );
  return data.matches;
}

export function mapStatus(fdStatus: FDMatch["status"]): "upcoming" | "live" | "finished" {
  if (fdStatus === "FINISHED") return "finished";
  if (fdStatus === "IN_PLAY" || fdStatus === "PAUSED") return "live";
  return "upcoming";
}
