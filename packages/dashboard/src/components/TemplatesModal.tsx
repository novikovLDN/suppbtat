import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Template } from '../types';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10';

export function TemplatesModal({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (text: string) => void;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
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
      await api.createTemplate(name.trim(), text.trim());
      setName('');
      setText('');
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="animate-slide-up flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[80vh] sm:max-w-lg sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">⚡ Шаблоны ответов</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAdding((v) => !v)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
            >
              {adding ? 'Отмена' : '+ Новый'}
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5">
          {adding && (
            <form onSubmit={create} className="mb-4 space-y-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Название (например, «Подключиться»)"
                className={inputCls}
                autoFocus
              />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Текст шаблонного сообщения…"
                rows={4}
                className={`${inputCls} resize-none`}
              />
              <button
                type="submit"
                disabled={saving || !name.trim() || !text.trim()}
                className="w-full rounded-xl bg-[#2563eb] py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#1d4ed8] active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? 'Сохранение…' : 'Сохранить шаблон'}
              </button>
            </form>
          )}

          {error && (
            <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-inset ring-rose-100">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-6 text-center text-sm text-slate-400">Загрузка…</div>
          ) : templates.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              <div className="mb-2 text-3xl opacity-50">⚡</div>
              Пока нет шаблонов. Нажмите «+ Новый», чтобы добавить.
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="group flex items-start gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 transition hover:border-blue-200 hover:bg-blue-50/50"
                >
                  <button onClick={() => onPick(tpl.text)} className="min-w-0 flex-1 text-left">
                    <div className="mb-0.5 text-sm font-semibold text-slate-800">{tpl.name}</div>
                    <div className="line-clamp-2 text-xs text-slate-400">{tpl.text}</div>
                  </button>
                  <button
                    onClick={() => onPick(tpl.text)}
                    className="shrink-0 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-200"
                    title="Вставить в поле ввода"
                  >
                    Вставить
                  </button>
                  <button
                    onClick={() => remove(tpl.id)}
                    className="shrink-0 rounded-full px-2 py-1.5 text-xs text-slate-400 transition hover:text-rose-500"
                    title="Удалить"
                  >
                    🗑
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
