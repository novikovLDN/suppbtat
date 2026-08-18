import { useMemo, useState } from 'react';
import { X, Star, Search, ExternalLink, User, Clock } from 'lucide-react';
import type { ChatStore } from '../useChatStore';
import { avatarColor, customerName, dateTime, initials } from '../lib/format';
import { Stars, ratingTone } from './Stars';

interface Props {
  store: ChatStore;
  onClose: () => void;
  onOpenChat: (ticketId: number) => void;
}

export function RatingsBoard({ store, onClose, onOpenChat }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<number | null>(null);
  const ratings = store.ratings;

  const summary = useMemo(() => {
    const count = ratings.length;
    const sum = ratings.reduce((a, r) => a + (r.rating ?? 0), 0);
    const avg = count ? sum / count : null;
    const distribution = [1, 2, 3, 4, 5].map((s) => ratings.filter((r) => r.rating === s).length);
    return { count, avg, distribution };
  }, [ratings]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ratings.filter((r) => {
      if (filter && r.rating !== filter) return false;
      if (!q) return true;
      const hay = [
        `#${r.number}`,
        customerName(r.customer),
        r.customer.username ?? '',
        r.subject ?? '',
        r.assignedOperatorName ?? '',
        r.assignedName ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [ratings, query, filter]);

  const goToChat = (id: number) => {
    onOpenChat(id);
    onClose();
  };

  const maxDist = Math.max(1, ...summary.distribution);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 pb-safe backdrop-blur-sm animate-overlay sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="panel animate-slide-up flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:h-[88dvh] sm:max-w-3xl sm:rounded-3xl"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3.5 sm:px-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Star size={16} className="text-amber-400" fill="currentColor" strokeWidth={0} /> Оценки качества
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-slate-400">
              {summary.count}
            </span>
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/[0.06]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {/* Summary */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
            <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div>
                <div className={`text-3xl font-semibold tabular-nums leading-none ${ratingTone(summary.avg == null ? null : Math.round(summary.avg))}`}>
                  {summary.avg == null ? '—' : summary.avg.toFixed(1)}
                </div>
                <div className="mt-1.5">
                  <Stars value={summary.avg == null ? 0 : Math.round(summary.avg)} size={13} />
                </div>
                <div className="label mt-1.5 text-[9px] text-slate-500">Средняя · {summary.count} оценок</div>
              </div>
            </div>
            {/* distribution */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((s) => {
                  const c = summary.distribution[s - 1];
                  const active = filter === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setFilter(active ? null : s)}
                      className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-0.5 text-left transition ${
                        active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className="flex w-8 shrink-0 items-center gap-0.5 text-[11px] text-slate-400">
                        {s} <Star size={10} className="text-amber-400" fill="currentColor" strokeWidth={0} />
                      </span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <span
                          className="block h-full rounded-full bg-amber-400/80"
                          style={{ width: `${(c / maxDist) * 100}%` }}
                        />
                      </span>
                      <span className="w-7 shrink-0 text-right text-[11px] tabular-nums text-slate-400">{c}</span>
                    </button>
                  );
                })}
              </div>
              {filter && (
                <button onClick={() => setFilter(null)} className="mt-2 text-[11px] text-indigo-300 hover:text-indigo-200">
                  Сбросить фильтр
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="tile mb-3 flex items-center gap-1.5 rounded-full px-3 py-2">
            <Search size={14} className="text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск: #, клиент, оператор, тема…"
              className="w-full bg-transparent text-[13px] text-slate-100 placeholder:text-slate-500 outline-none"
            />
          </div>

          {/* List */}
          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Star size={30} strokeWidth={1.25} className="text-slate-600" />
              <p className="text-sm text-slate-500">Пока нет оценок</p>
            </div>
          ) : (
            <div className="space-y-2">
              {list.map((r) => (
                <div
                  key={r.id}
                  className="animate-fade-in rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarColor(
                        r.customer.id,
                      )}`}
                    >
                      {initials(r.customer)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-slate-100">
                          {customerName(r.customer)}
                        </span>
                        <Stars value={r.rating} size={15} />
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                        <span className="font-mono">#{r.number}</span>
                        {r.subject && <span className="truncate">· {r.subject}</span>}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <User size={11} className="text-slate-500" />
                          {r.assignedOperatorName || '—'}
                          {r.assignedName && <span className="text-slate-500">· как «{r.assignedName}»</span>}
                        </span>
                        {r.ratedAt && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock size={11} /> {dateTime(r.ratedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => goToChat(r.id)}
                    className="tile tile-hover mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-medium text-slate-200 transition active:scale-[0.99]"
                  >
                    <ExternalLink size={13} /> Перейти в диалог
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
