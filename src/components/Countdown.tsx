import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/mock-data";

export function Countdown({ iso, className }: { iso: string; className?: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setLabel(formatCountdown(iso));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [iso]);

  return <span className={className}>{label ?? "—"}</span>;
}
