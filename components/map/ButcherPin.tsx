"use client";

/**
 * Map pin as a hanging butcher's tag: punched hole, rating + shop name,
 * slight tilt that straightens when selected.
 */
export function ButcherPin({
  selected,
  rating,
  name,
}: {
  selected: boolean;
  rating: number | null;
  name: string;
}) {
  return (
    <div
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
        {/* punched hole */}
        <span
          className={`absolute -top-[5px] h-2 w-2 rounded-full border-2 ${
            selected ? "bg-oxblood-ink border-oxblood-strong" : "bg-background border-oxblood"
          }`}
        />
        <span className="font-display font-bold text-sm leading-none tracking-tight">
          {rating != null ? rating.toFixed(1) : "—"}
        </span>
        <span className="w-full text-center text-[8px] font-semibold uppercase tracking-[0.08em] leading-tight truncate opacity-90">
          {name}
        </span>
      </div>
      {/* pointer */}
      <div className={`h-2 w-0.5 ${selected ? "bg-oxblood-strong" : "bg-oxblood/70"}`} />
    </div>
  );
}
