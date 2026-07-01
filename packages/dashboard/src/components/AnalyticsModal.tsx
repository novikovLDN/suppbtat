import { useEffect, useState } from 'react';
import { X, BarChart3, RefreshCw } from 'lucide-react';
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

  const maxDay = stats ? Math.max(1, ...stats.perDay.map((d) => d.count)) : 1;
  const maxRep = stats ? Math.max(1, ...stats.operators.map((o) => o.replies7d)) : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 pb-safe backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="panel animate-slide-up flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:max-h-[85dvh] sm:max-w-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <BarChart3 size={16} /> Аналитика
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/[0.06]"
              title="Обновить"
            >
              <RefreshCw size={15} />
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
            <div className="py-8 text-center text-sm text-slate-400">Загрузка…</div>
          ) : error ? (
            <div className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div>
          ) : stats ? (
            <div className="space-y-5">
              {/* KPI cards */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Kpi label="Открыто" value={stats.open} />
                <Kpi label="Не взято" value={stats.unassigned} accent={stats.unassigned > 0} />
                <Kpi label="В работе" value={stats.inWork} />
                <Kpi label="Закрыто всего" value={stats.closedTotal} />
                <Kpi label="Создано сегодня" value={stats.today.created} />
                <Kpi label="Закрыто сегодня" value={stats.today.closed} />
                <Kpi label="Ср. 1-й ответ" value={minutesLabel(stats.avgFirstResponseMin)} />
                <Kpi label="Ср. решение" value={minutesLabel(stats.avgResolutionMin)} />
              </div>

              {/* Tickets per day */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="label mb-3 text-[10px] text-slate-500">Тикетов по дням (7 дн.)</div>
                <div className="flex items-end justify-between gap-2" style={{ height: 120 }}>
                  {stats.perDay.length === 0 && <div className="text-xs text-slate-500">Нет данных</div>}
                  {stats.perDay.map((d) => (
                    <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className="accent w-full rounded-md"
                          style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count ? 6 : 0 }}
                          title={`${d.count}`}
                        />
                      </div>
                      <span className="text-[9px] text-slate-500">
                        {new Date(d.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-operator */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="label mb-3 text-[10px] text-slate-500">Операторы (ответов за 7 дн.)</div>
                <div className="space-y-2.5">
                  {stats.operators.map((o) => (
                    <div key={o.id} className="flex items-center gap-3 text-xs">
                      <span className="w-28 shrink-0 truncate text-slate-200">{o.name}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="accent h-full rounded-full" style={{ width: `${(o.replies7d / maxRep) * 100}%` }} />
                      </div>
                      <span className="w-20 shrink-0 text-right text-slate-400">
                        {o.replies7d} · <span className="text-slate-500">в работе {o.active}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${accent ? 'border-indigo-400/30 bg-indigo-500/10' : 'border-white/[0.06] bg-white/[0.02]'}`}>
      <div className="text-xl font-semibold text-white">{value}</div>
      <div className="label mt-0.5 text-[9px] text-slate-500">{label}</div>
    </div>
  );
}
