// Tiny generated crest using initials + deterministic color
export function TeamCrest({ short, size = 44 }: { short: string; size?: number }) {
  // Deterministic hue from team short code
  let hash = 0;
  for (let i = 0; i < short.length; i++) hash = (hash * 31 + short.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  const bg = `oklch(0.42 0.12 ${hue})`;
  const bg2 = `oklch(0.30 0.10 ${(hue + 40) % 360})`;
  return (
    <div
      className="grid shrink-0 place-items-center rounded-xl font-display text-xs tracking-wider text-foreground shadow-card ring-1 ring-border"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${bg}, ${bg2})`,
      }}
    >
      {short}
    </div>
  );
}
