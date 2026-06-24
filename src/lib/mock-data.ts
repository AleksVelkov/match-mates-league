export type Member = {
  id: string;
  name: string;
  avatar: string; // initials
  points: number;
  weekly: number;
  streak: number;
  exact: number;
};

export type Fixture = {
  id: string;
  home: string;
  homeShort: string;
  away: string;
  awayShort: string;
  kickoff: string; // ISO
  predictionHome: number | null;
  predictionAway: number | null;
  isJoker?: boolean;
  status: "upcoming" | "live" | "finished";
  resultHome?: number;
  resultAway?: number;
};

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
};

export const currentGroup = {
  id: "g1",
  name: "Sunday Football Crew",
  emoji: "⚽",
  description: "Premier League 2026 — winner buys pints.",
  competition: "Premier League",
  round: 8,
  memberCount: 12,
  inviteCode: "SFC-8421",
};

export const members: Member[] = [
  { id: "u1", name: "Aleks",   avatar: "AK", points: 1201, weekly: 58, streak: 7, exact: 14 },
  { id: "u2", name: "Biljana", avatar: "BJ", points: 1234, weekly: 50, streak: 4, exact: 17 },
  { id: "u3", name: "Mark",    avatar: "MR", points: 1178, weekly: 43, streak: 3, exact: 11 },
  { id: "u4", name: "Sara",    avatar: "SA", points: 1102, weekly: 39, streak: 2, exact: 9  },
  { id: "u5", name: "Niko",    avatar: "NK", points: 1055, weekly: 36, streak: 1, exact: 7  },
  { id: "u6", name: "Eva",     avatar: "EV", points: 998,  weekly: 31, streak: 0, exact: 6  },
  { id: "u7", name: "Tom",     avatar: "TM", points: 940,  weekly: 28, streak: 0, exact: 5  },
  { id: "u8", name: "Lana",    avatar: "LN", points: 902,  weekly: 24, streak: 2, exact: 4  },
];

const now = Date.now();
const hours = (h: number) => new Date(now + h * 3600_000).toISOString();

export const fixtures: Fixture[] = [
  { id: "f1", home: "Liverpool",       homeShort: "LIV", away: "Arsenal",       awayShort: "ARS", kickoff: hours(2),  predictionHome: 2, predictionAway: 1, status: "upcoming" },
  { id: "f2", home: "Manchester City", homeShort: "MCI", away: "Everton",       awayShort: "EVE", kickoff: hours(4),  predictionHome: 3, predictionAway: 0, isJoker: true, status: "upcoming" },
  { id: "f3", home: "Chelsea",         homeShort: "CHE", away: "Tottenham",     awayShort: "TOT", kickoff: hours(6),  predictionHome: 1, predictionAway: 1, status: "upcoming" },
  { id: "f4", home: "Newcastle",       homeShort: "NEW", away: "Brighton",      awayShort: "BHA", kickoff: hours(26), predictionHome: 2, predictionAway: 0, status: "upcoming" },
  { id: "f5", home: "Aston Villa",     homeShort: "AVL", away: "West Ham",      awayShort: "WHU", kickoff: hours(28), predictionHome: null, predictionAway: null, status: "upcoming" },
  { id: "f6", home: "Brentford",       homeShort: "BRE", away: "Crystal Palace",awayShort: "CRY", kickoff: hours(30), predictionHome: null, predictionAway: null, status: "upcoming" },
  { id: "f7", home: "Fulham",          homeShort: "FUL", away: "Wolves",        awayShort: "WOL", kickoff: hours(48), predictionHome: null, predictionAway: null, status: "upcoming" },
  { id: "f8", home: "Nottm Forest",    homeShort: "NFO", away: "Bournemouth",   awayShort: "BOU", kickoff: hours(50), predictionHome: null, predictionAway: null, status: "upcoming" },
  { id: "f9", home: "Leicester",       homeShort: "LEI", away: "Burnley",       awayShort: "BUR", kickoff: hours(52), predictionHome: null, predictionAway: null, status: "upcoming" },
  { id: "f10",home: "Ipswich",         homeShort: "IPS", away: "Southampton",   awayShort: "SOU", kickoff: hours(54), predictionHome: null, predictionAway: null, status: "upcoming" },
];

export const achievements: Achievement[] = [
  { id: "a1", name: "First Exact Score",   description: "Nail one on the head.",          icon: "🎯", unlocked: true },
  { id: "a2", name: "10 Exact Scores",     description: "You see the future.",            icon: "🔮", unlocked: true },
  { id: "a3", name: "25 Exact Scores",     description: "Certified clairvoyant.",         icon: "🧿", unlocked: false },
  { id: "a4", name: "Perfect Round",       description: "Every fixture, every score.",    icon: "💯", unlocked: false },
  { id: "a5", name: "Giant Killer",        description: "Predict an away upset.",         icon: "🗡️", unlocked: true },
  { id: "a6", name: "Unstoppable",         description: "10 correct outcomes in a row.",  icon: "⚡", unlocked: false },
  { id: "a7", name: "Prediction Legend",   description: "Reach 1000 total points.",       icon: "👑", unlocked: true },
  { id: "a8", name: "Joker Master",        description: "5 successful jokers.",           icon: "⭐", unlocked: false },
];

export const me: Member = {
  id: "me", name: "You", avatar: "YO", points: 1201, weekly: 58, streak: 7, exact: 14,
};

export const suggestedScores: Array<[number, number]> = [
  [1, 0], [2, 0], [2, 1], [1, 1], [0, 0], [0, 1],
];

export function formatCountdown(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Live";
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}
