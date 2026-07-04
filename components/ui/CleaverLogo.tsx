/**
 * The Six Cut mark: a tilted butcher's cleaver whose sweep forms the digit 6 —
 * blade angled up-right (the flag), handle curving into the bowl.
 */
export function CleaverLogo({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 128"
      width={(size * 100) / 128}
      height={size}
      className={className}
      role="img"
      aria-label="The Six Cut"
      fill="none"
    >
      <path
        d="M36 36 C48 26 61 16 74 10 L89 32 C76 40 63 49 51.5 58 Z M76 21 a3.5 3.5 0 1 0 0.01 0 Z"
        fill="currentColor"
        fillRule="evenodd"
      />
      <path
        d="M50 56 C42 68 33 76 30 88"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <circle cx="46" cy="98" r="19" stroke="currentColor" strokeWidth="11" />
    </svg>
  );
}
