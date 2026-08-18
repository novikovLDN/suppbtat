import { Star } from 'lucide-react';

/** Filled/empty star row. `value` 1..5 (0/undefined → all empty). */
export function Stars({ value, size = 14 }: { value: number | null; size?: number }) {
  const v = value ?? 0;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${v} из 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= v ? 'text-amber-400' : 'text-slate-600'}
          fill={i <= v ? 'currentColor' : 'none'}
          strokeWidth={i <= v ? 0 : 1.6}
        />
      ))}
    </span>
  );
}

/** Colour tone for a rating value — green good, amber ok, rose poor. */
export function ratingTone(v: number | null): string {
  if (v == null) return 'text-slate-500';
  if (v >= 4) return 'text-emerald-400';
  if (v === 3) return 'text-amber-400';
  return 'text-rose-400';
}
