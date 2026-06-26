import { useState } from "react";
import { Trophy } from "lucide-react";
import { leagueEmblemUrl } from "@/lib/football-data";

/** League emblem from football-data.org, with a trophy fallback if it's missing/fails. */
export function LeagueCrest({
  competition,
  size = 28,
}: {
  competition: string;
  size?: number;
}) {
  const url = leagueEmblemUrl(competition);
  const [imgError, setImgError] = useState(false);
  const showImg = !!url && !imgError;

  return (
    <span
      className="grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {showImg ? (
        <img
          src={url}
          alt=""
          width={size}
          height={size}
          className="object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <Trophy className="text-muted-foreground" style={{ width: size * 0.7, height: size * 0.7 }} />
      )}
    </span>
  );
}
