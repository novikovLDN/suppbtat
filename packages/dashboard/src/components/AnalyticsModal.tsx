import { useEffect, useMemo, useState } from 'react';
import { X, LineChart, RefreshCw, ArrowUpRight, ArrowDownRight, Minus, Clock, Timer, CheckCircle2, Inbox } from 'lucide-react';
import { api } from '../api';
import type { Stats } from '../types';
import { minutesLabel } from '../lib/format';

export function AnalyticsModal({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .getStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const d = useMemo(() => {
    if (!stats) return null;
    const days = stats.perDay;
    const last7 = days.slice(-7);
    const prev7 = days.slice(-14, -7);
    const sum = (arr: typeof days, k: 'created' | 'closed') => arr.reduce((a, x) => a + x[k], 0);
    const created7 = sum(last7, 'created');
    const closed7 = sum(last7, 'closed');
    const createdPrev = sum(prev7, 'created');
    const closedPrev = sum(prev7, 'closed');
    const resolution = created7 > 0 ? Math.round((closed7 / created7) * 100) : null;
    return {
      last7,
      prev7,
      created7,
      closed7,
      createdDelta: pctDelta(created7, createdPrev),
      closedDelta: pctDelta(closed7, closedPrev),
      resolution,
    };
  }, [stats]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 pb-safe backdrop-blur-sm animate-overlay sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="panel animate-slide-up flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:max-h-[88dvh] sm:max-w-3xl sm:rounded-3xl"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <LineChart size={16} /> Обзор
            <span className="label ml-1 text-[9px] text-slate-500">Реальное время</span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/[0.06]"
              title="Обновить"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/[0.06]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5">
          {loading && !stats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-[76px] rounded-2xl" />
                ))}
              </div>
              <div className="skeleton h-40 rounded-2xl" />
            </div>
          ) : error ? (
            <div className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div>
          ) : stats && d ? (
            <div className="animate-fade-in space-y-4">
              {/* Live queue state */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <Stat icon={<Inbox size={13} />} label="Открыто" value={stats.open} tone="neutral" />
                <Stat icon={<Timer size={13} />} label="Не взято" value={stats.unassigned} tone={stats.unassigned > 0 ? 'warn' : 'neutral'} />
                <Stat icon={<LineChart size={13} />} label="В работе" value={stats.inWork} tone="accent" />
                <Stat icon={<CheckCircle2 size={13} />} label="Закрыто всего" value={stats.closedTotal} tone="ok" />
              </div>

              {/* Response speed */}
              <div className="grid grid-cols-2 gap-2.5">
                <SpeedCard
                  icon={<Clock size={13} />}
                  label="Ср. первый ответ"
                  minutes={stats.avgFirstResponseMin}
                  good={5}
                  warn={30}
                />
                <SpeedCard
                  icon={<CheckCircle2 size={13} />}
                  label="Ср. время решения"
                  minutes={stats.avgResolutionMin}
                  good={60}
                  warn={240}
                />
              </div>

              {/* Created vs resolved — 14-day dynamics */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="label text-[10px] text-slate-500">Динамика · 14 дней</div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <Legend color="bg-indigo-400" label="Создано" />
                    <Legend color="bg-emerald-400" label="Решено" />
                  </div>
                </div>
                <TrendBars data={stats.perDay} />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <MiniStat label="Создано / 7дн" value={d.created7} delta={d.createdDelta} invert />
                  <MiniStat label="Решено / 7дн" value={d.closed7} delta={d.closedDelta} />
                  <MiniStat label="Закрытие" value={d.resolution == null ? '—' : `${d.resolution}%`} />
                </div>
              </div>

              {/* Today */}
              <div className="grid grid-cols-2 gap-2.5">
                <Stat icon={<Inbox size={13} />} label="Создано сегодня" value={stats.today.created} tone="accent" />
                <Stat icon={<CheckCircle2 size={13} />} label="Закрыто сегодня" value={stats.today.closed} tone="ok" />
              </div>

              {/* Operators leaderboard */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="label mb-3 text-[10px] text-slate-500">Операторы · ответов за 7 дней</div>
                <div className="space-y-2.5">
                  {stats.operators.length === 0 && (
                    <div className="text-xs text-slate-500">Нет активных операторов</div>
                  )}
                  {stats.operators.map((o, i) => {
                    const max = Math.max(1, ...stats.operators.map((x) => x.replies7d));
                    return (
                      <div key={o.id} className="flex items-center gap-3 text-xs">
                        <span className="w-4 shrink-0 text-right font-mono text-[10px] text-slate-600">{i + 1}</span>
                        <span className="w-24 shrink-0 truncate text-slate-200 sm:w-32">{o.name}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="accent h-full rounded-full transition-[width] duration-500 ease-out"
                            style={{ width: `${(o.replies7d / max) * 100}%` }}
                          />
                        </div>
                        <span className="w-24 shrink-0 text-right text-slate-400">
                          <span className="tabular-nums text-slate-200">{o.replies7d}</span> ·{' '}
                          <span className="text-slate-500">в работе {o.active}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function pctDelta(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null; // no baseline
  return Math.round(((cur - prev) / prev) * 100);
}

const TONE = {
  neutral: 'text-slate-400',
  accent: 'text-indigo-300',
  ok: 'text-emerald-300',
  warn: 'text-amber-300',
} as const;

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: keyof typeof TONE;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className={`mb-1.5 flex items-center gap-1 text-[10px] ${TONE[tone]}`}>{icon}</div>
      <div className="text-2xl font-semibold leading-none tracking-tight tabular-nums text-slate-100">{value}</div>
      <div className="label mt-1.5 text-[9px] text-slate-500">{label}</div>
    </div>
  );
}

function SpeedCard({
  icon,
  label,
  minutes,
  good,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  minutes: number | null;
  good: number;
  warn: number;
}) {
  const tone =
    minutes == null ? 'text-slate-500' : minutes <= good ? 'text-emerald-300' : minutes <= warn ? 'text-amber-300' : 'text-rose-300';
  const dot =
    minutes == null ? 'bg-slate-600' : minutes <= good ? 'bg-emerald-400' : minutes <= warn ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">{icon}<span className="label">{label}</span></div>
      <div className={`flex items-center gap-2 text-xl font-semibold tracking-tight ${minutes == null ? 'text-slate-500' : 'text-slate-100'}`}>
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {minutesLabel(minutes)}
      </div>
      <div className={`mt-1 text-[10px] ${tone}`}>
        {minutes == null ? 'нет данных' : minutes <= good ? 'отлично' : minutes <= warn ? 'нормально' : 'медленно'}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 text-slate-400">
      <span className={`h-2 w-2 rounded-sm ${color}`} /> {label}
    </span>
  );
}

function TrendBars({ data }: { data: Stats['perDay'] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.created, d.closed)));
  return (
    <div className="flex items-stretch justify-between gap-1 overflow-x-auto" style={{ height: 116 }}>
      {data.map((day) => (
        <div key={day.date} className="flex h-full min-w-[16px] flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end justify-center gap-[3px]">
            <span
              className="w-[6px] rounded-t bg-indigo-400/90 transition-[height] duration-500 ease-out"
              style={{ height: `${(day.created / max) * 100}%`, minHeight: day.created ? 4 : 0 }}
              title={`Создано: ${day.created}`}
            />
            <span
              className="w-[6px] rounded-t bg-emerald-400/90 transition-[height] duration-500 ease-out"
              style={{ height: `${(day.closed / max) * 100}%`, minHeight: day.closed ? 4 : 0 }}
              title={`Решено: ${day.closed}`}
            />
          </div>
          <span className="text-[8px] text-slate-600">
            {new Date(day.date).toLocaleDateString('ru-RU', { day: '2-digit' })}
          </span>
        </div>
      ))}
    </div>
  );
}

function MiniStat({
  label,
  value,
  delta,
  invert,
}: {
  label: string;
  value: number | string;
  delta?: number | null;
  invert?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-2.5">
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-semibold tabular-nums text-slate-100">{value}</span>
        {delta != null && <DeltaChip delta={delta} invert={invert} />}
      </div>
      <div className="label mt-1 text-[9px] text-slate-500">{label}</div>
    </div>
  );
}

function DeltaChip({ delta, invert }: { delta: number; invert?: boolean }) {
  const up = delta > 0;
  const flat = delta === 0;
  // For "created", up is bad (invert); for "closed", up is good.
  const good = flat ? null : invert ? !up : up;
  const cls = good == null ? 'text-slate-500' : good ? 'text-emerald-400' : 'text-rose-400';
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-medium ${cls}`}>
      <Icon size={11} />
      {Math.abs(delta)}%
    </span>
  );
}
