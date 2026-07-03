"use client";

/** Cleaver-badge map pin; scales up when selected. */
export function ButcherPin({
  selected,
  rating,
}: {
  selected: boolean;
  rating: number | null;
}) {
  return (
    <div
      className={`flex flex-col items-center cursor-pointer transition-transform duration-150 ${
        selected ? "scale-125 z-10" : "hover:scale-110"
      }`}
    >
      <div
        className={`flex items-center justify-center rounded-full border-2 shadow-md h-9 w-9 text-lg select-none ${
          selected
            ? "bg-oxblood border-oxblood-dark text-parchment"
            : "bg-parchment border-oxblood text-oxblood"
        }`}
      >
        🔪
      </div>
      {rating != null && (
        <span
          className={`-mt-1 rounded-full px-1.5 text-[10px] font-bold shadow-sm ${
            selected ? "bg-oxblood-dark text-parchment" : "bg-white text-foreground"
          }`}
        >
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
