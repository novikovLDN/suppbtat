import { useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';

/**
 * Full-screen image viewer. Opens in-app (not a new tab), fits any screen,
 * tap to zoom, close via the top-right ✕ / backdrop tap / Esc.
 */
export function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="animate-fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* top bar with controls (respects safe area) */}
      <div
        className="absolute inset-x-0 top-0 z-10 flex items-center justify-end gap-2 p-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoomed((z) => !z);
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
          title={zoomed ? 'Уменьшить' : 'Увеличить'}
        >
          {zoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
        </button>
        <a
          href={url}
          download
          onClick={(e) => e.stopPropagation()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
          title="Скачать"
        >
          <Download size={20} />
        </a>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
          title="Закрыть"
        >
          <X size={20} />
        </button>
      </div>

      {/* image area — tap backdrop to close */}
      <div className="flex h-full w-full items-center justify-center overflow-auto p-4" onClick={onClose}>
        <img
          src={url}
          alt="вложение"
          onClick={(e) => {
            e.stopPropagation();
            setZoomed((z) => !z);
          }}
          className={`select-none rounded-xl transition-transform duration-200 ${
            zoomed
              ? 'max-w-none cursor-zoom-out'
              : 'max-h-[85dvh] max-w-[92vw] cursor-zoom-in object-contain'
          }`}
          style={zoomed ? { width: 'min(180vw, 1600px)' } : undefined}
        />
      </div>
    </div>
  );
}
