import { useState } from "react";

// Curated set — football, competition, and group-flavored emojis. Tappable on any
// device, so no emoji keyboard is required to set a group icon.
export const GROUP_EMOJIS = [
  "⚽", "🏆", "🥅", "🧤", "👟", "🎯", "🔥", "⭐", "⚡", "💥",
  "🦁", "🐯", "🐺", "🦅", "🐉", "🐐", "👑", "💪", "🚀", "🎉",
  "🍺", "🎲", "🃏", "💯", "🥇", "🛡️", "⚔️", "🌟", "😎", "🤝",
];

/** Tap-to-pick emoji input. Shows the current emoji; expands a grid on tap. */
export function EmojiPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Choose group icon"
        className={[
          "grid h-12 w-16 place-items-center rounded-2xl border bg-background text-2xl outline-none transition-colors",
          open ? "border-primary ring-2 ring-primary/30" : "border-border",
        ].join(" ")}
      >
        {value || "⚽"}
      </button>

      {open && (
        <>
          {/* tap-away backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-14 z-50 w-[260px] rounded-2xl border border-border bg-surface p-2 shadow-card animate-in fade-in zoom-in-95 duration-150">
            <div className="grid grid-cols-6 gap-1">
              {GROUP_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    onChange(e);
                    setOpen(false);
                  }}
                  className={[
                    "grid h-10 w-10 place-items-center rounded-xl text-xl transition-colors",
                    value === e ? "bg-primary/20 ring-1 ring-primary/40" : "hover:bg-background",
                  ].join(" ")}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
