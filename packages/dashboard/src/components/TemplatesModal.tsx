import { useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2, Zap, Pin, Search } from 'lucide-react';
import { api } from '../api';
import type { Template } from '../types';

const inputCls =
  'tile w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-indigo-400/40 focus:ring-4 focus:ring-indigo-500/10';

export function TemplatesModal({ onClose, onPick }: { onClose: () => void; onPick: (text: string) => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    api
      .listTemplates()
      .then((r) => setTemplates(r.templates))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createTemplate({ name: name.trim(), text: text.trim(), category: category.trim() || undefined });
      setName('');
      setText('');
      setCategory('');
      setAdding(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    await api.deleteTemplate(id);
    setTemplates((p) => p.filter((t) => t.id !== id));
  };
  const togglePin = async (t: Template) => {
    await api.updateTemplate(t.id, { pinned: !t.pinned });
    load();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) => t.name.toLowerCase().includes(q) || t.text.toLowerCase().includes(q) || (t.category ?? '').toLowerCase().includes(q),
    );
  }, [templates, search]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 pb-safe backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="panel animate-slide-up flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:max-h-[80dvh] sm:max-w-lg sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Zap size={16} className="text-indigo-300" /> Шаблоны ответов
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAdding((v) => !v)}
              className="tile tile-hover flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-slate-200 transition"
            >
              {adding ? 'Отмена' : (<><Plus size={14} /> Новый</>)}
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
          {adding && (
            <form onSubmit={create} className="mb-4 space-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название (например, «Подключиться»)" className={inputCls} autoFocus />
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Категория (необязательно)" className={inputCls} />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Текст. Переменные: {имя}, {номер}, {username}"
                rows={4}
                className={`${inputCls} resize-none`}
              />
              <p className="text-[11px] text-slate-500">
                Переменные подставятся автоматически: <span className="text-slate-400">{'{имя}'}</span>,{' '}
                <span className="text-slate-400">{'{номер}'}</span>, <span className="text-slate-400">{'{username}'}</span>.
              </p>
              <button
                type="submit"
                disabled={saving || !name.trim() || !text.trim()}
                className="accent w-full rounded-xl py-2.5 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? 'Сохранение…' : 'Сохранить шаблон'}
              </button>
            </form>
          )}

          {templates.length > 4 && (
            <div className="relative mb-3">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск шаблона" className={`${inputCls} pl-9`} />
            </div>
          )}

          {error && (
            <div className="mb-3 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-inset ring-rose-500/20">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-6 text-center text-sm text-slate-400">Загрузка…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center text-sm text-slate-400">
              <Zap size={30} strokeWidth={1.25} className="mb-2 opacity-40" />
              {templates.length === 0 ? 'Пока нет шаблонов. Нажмите «Новый».' : 'Ничего не найдено.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((tpl) => (
                <div
                  key={tpl.id}
                  className="group flex items-start gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 transition hover:border-indigo-400/30 hover:bg-indigo-500/10"
                >
                  <button onClick={() => onPick(tpl.text)} className="min-w-0 flex-1 text-left">
                    <div className="mb-0.5 flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-100">{tpl.name}</span>
                      {tpl.category && (
                        <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-slate-400">{tpl.category}</span>
                      )}
                    </div>
                    <div className="line-clamp-2 text-xs text-slate-400">{tpl.text}</div>
                  </button>
                  <button
                    onClick={() => togglePin(tpl)}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:bg-white/[0.06] ${
                      tpl.pinned ? 'text-indigo-300' : 'text-slate-500'
                    }`}
                    title={tpl.pinned ? 'Открепить' : 'Закрепить (в быстрые ответы)'}
                  >
                    <Pin size={15} className={tpl.pinned ? 'fill-current' : ''} />
                  </button>
                  <button
                    onClick={() => remove(tpl.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/[0.06] hover:text-rose-400"
                    title="Удалить"
                  >
                    <Trash2 size={15} />
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
