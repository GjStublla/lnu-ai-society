import type { PriceInterval } from "@/types/contracts";
import { formatStockholmTime } from "@/lib/mock/time";
import { priceThresholds } from "./advice";

/** Thin one-row 24h strip: happy-hour window in the energy accent, peak slots in amber. */
export function PriceStrip({
  intervals,
  highlight,
  nowMs,
}: {
  intervals: PriceInterval[];
  highlight: { startIndex: number; endIndex: number; startsAt: string; endsAt: string } | null;
  nowMs: number | null;
}) {
  if (intervals.length === 0) return null;
  const prices = intervals.map((i) => i.sekPerKwh);
  const max = Math.max(...prices, 0.01);
  const min = Math.min(...prices, 0);
  const span = max - min || 1;
  const n = intervals.length;
  const t = priceThresholds(intervals);
  const dayStart = Date.parse(intervals[0].startsAt);
  const dayEnd = Date.parse(intervals[n - 1].endsAt);
  const nowX = nowMs !== null && nowMs >= dayStart && nowMs < dayEnd ? ((nowMs - dayStart) / (dayEnd - dayStart)) * n : null;
  const ticks = [0, 0.25, 0.5, 0.75].map((f) => Math.min(n - 1, Math.round(f * n)));

  return (
    <figure className="mt-2">
      <svg viewBox={`0 0 ${n} 28`} preserveAspectRatio="none" className="block h-8 w-full" aria-hidden="true">
        {intervals.map((interval, i) => {
          const h = 3 + ((interval.sekPerKwh - min) / span) * 25;
          const inWindow = highlight !== null && i >= highlight.startIndex && i < highlight.endIndex;
          const fill = inWindow ? "var(--energy-strong)" : interval.sekPerKwh >= t.high ? "var(--peak)" : "var(--strip)";
          return <rect key={interval.startsAt} x={i + 0.14} y={28 - h} width={0.72} height={h} rx={0.3} fill={fill} />;
        })}
        {nowX !== null && <rect x={nowX - 0.15} y={0} width={0.3} height={28} fill="var(--primary)" />}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground" aria-hidden="true">
        {ticks.map((tick) => (
          <span key={tick}>{formatStockholmTime(intervals[tick].startsAt)}</span>
        ))}
        <span>24:00</span>
      </div>
      <figcaption className="sr-only">
        Prices in 15-minute slots from {min.toFixed(2)} to {max.toFixed(2)} SEK/kWh.
        {highlight ? ` Happy hour ${formatStockholmTime(highlight.startsAt)} to ${formatStockholmTime(highlight.endsAt)}.` : " No clear happy hour."}
      </figcaption>
    </figure>
  );
}
