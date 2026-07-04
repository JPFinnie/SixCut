"use client";

/**
 * Map pin as a hanging butcher's tag. Compact mode (city zoom) is a small
 * score dot; full mode (zoomed in) shows the tag with score + shop name.
 */
export function ButcherPin({
  selected,
  score,
  name,
  compact = false,
}: {
  selected: boolean;
  score: number | null;
  name: string;
  compact?: boolean;
}) {
  const label = `${name}${score != null ? `, Six Cut Score ${score.toFixed(1)} out of 10` : ""}`;

  if (compact && !selected) {
    return (
      <div
        role="button"
        aria-label={label}
        className="group flex flex-col items-center cursor-pointer transition-transform duration-150 hover:scale-125"
      >
        <div className="grid place-items-center h-6 w-6 rounded-full border-2 bg-surface border-oxblood text-oxblood shadow-md">
          <span className="font-display font-bold text-[9px] leading-none">
            {score != null ? score.toFixed(1) : "—"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      aria-label={label}
      className={`group flex flex-col items-center cursor-pointer transition-transform duration-200 ease-out ${
        selected ? "scale-125 z-10" : "hover:scale-110"
      }`}
    >
      <div
        className={`relative flex flex-col items-center rounded-md border-2 px-2.5 pb-1 pt-1.5 shadow-md transition-all duration-200 max-w-[8.5rem]
          ${selected
            ? "rotate-0 bg-oxblood border-oxblood-strong text-oxblood-ink shadow-lg"
            : "-rotate-3 bg-surface border-oxblood text-oxblood group-hover:-rotate-1"
          }`}
      >
        <span
          className={`absolute -top-[5px] h-2 w-2 rounded-full border-2 ${
            selected ? "bg-oxblood-ink border-oxblood-strong" : "bg-background border-oxblood"
          }`}
        />
        <span className="font-display font-bold text-sm leading-none tracking-tight">
          {score != null ? score.toFixed(1) : "—"}
        </span>
        <span className="w-full text-center text-[8px] font-semibold uppercase tracking-[0.08em] leading-tight truncate opacity-90">
          {name}
        </span>
      </div>
      <div className={`h-2 w-0.5 ${selected ? "bg-oxblood-strong" : "bg-oxblood/70"}`} />
    </div>
  );
}
