// Decorative, deterministic fake QR. Encodes nothing; DEMO — NOT REDEEMABLE.
const SIZE = 21;

function seeded(code: string) {
  let h = 2166136261;
  for (const ch of code) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };
}

function isFinder(x: number, y: number) {
  const inBox = (bx: number, by: number) => x >= bx && x < bx + 7 && y >= by && y < by + 7;
  return inBox(0, 0) || inBox(SIZE - 7, 0) || inBox(0, SIZE - 7);
}

export function DemoQr({ code, className }: { code: string; className?: string }) {
  const rand = seeded(code);
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const v = rand();
      if (isFinder(x, y)) continue;
      if (x >= 7 && x <= 13 && y >= 8 && y <= 12) continue; // DEMO label area
      if (v > 0.52) cells.push({ x, y });
    }
  }
  const finders = [
    [0, 0],
    [SIZE - 7, 0],
    [0, SIZE - 7],
  ];
  return (
    <svg viewBox={`-1 -1 ${SIZE + 2} ${SIZE + 2}`} className={className} role="img" aria-label="Illustrative QR pattern for a demo voucher. Not scannable, not redeemable.">
      <rect x="-1" y="-1" width={SIZE + 2} height={SIZE + 2} rx="1.5" fill="#fff" />
      {cells.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width="1" height="1" fill="#10201d" />
      ))}
      {finders.map(([fx, fy]) => (
        <g key={`${fx}-${fy}`}>
          <rect x={fx + 0.5} y={fy + 0.5} width="6" height="6" fill="none" stroke="#10201d" strokeWidth="1" />
          <rect x={fx + 2} y={fy + 2} width="3" height="3" fill="#0b5d55" />
        </g>
      ))}
      <rect x="6.6" y="8.4" width="7.8" height="4.2" rx="0.6" fill="#0b5d55" />
      <text x="10.5" y="11.4" textAnchor="middle" fontSize="2.4" fontWeight="700" fill="#fff" fontFamily="sans-serif">
        DEMO
      </text>
    </svg>
  );
}
