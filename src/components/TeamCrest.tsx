import { useState } from "react";

export function TeamCrest({
  short,
  crestUrl,
  size = 44,
}: {
  short: string;
  crestUrl?: string | null;
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const showImg = !!crestUrl && !imgError;

  // Deterministic hue from TLA — used as fallback background
  let hash = 0;
  for (let i = 0; i < short.length; i++) hash = (hash * 31 + short.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  const bg = `oklch(0.42 0.12 ${hue})`;
  const bg2 = `oklch(0.30 0.10 ${(hue + 40) % 360})`;

  return (
    <div
      className="grid shrink-0 place-items-center overflow-hidden rounded-xl font-display text-xs tracking-wider text-foreground shadow-card ring-1 ring-border"
      style={{
        width: size,
        height: size,
        background: showImg ? "transparent" : `linear-gradient(135deg, ${bg}, ${bg2})`,
      }}
    >
      {showImg ? (
        <img
          src={crestUrl}
          alt={short}
          width={size - 6}
          height={size - 6}
          className="object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        short
      )}
    </div>
  );
}
