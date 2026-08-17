import { useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';

export type ViewerKind = 'image' | 'pdf';

/**
 * Full-screen in-app viewer for images and PDFs. Opens over the app (not a new
 * tab), fits any screen, close via ✕ / backdrop tap / Esc. Images support
 * tap-to-zoom; PDFs render in an embedded viewer.
 */
export function Lightbox({
  url,
  onClose,
  kind = 'image',
  name,
}: {
  url: string;
  onClose: () => void;
  kind?: ViewerKind;
  name?: string;
}) {
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

  const isPdf = kind === 'pdf';

  return (
    <div className="animate-fade-in fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm">
      {/* top bar with controls (respects safe area) */}
      <div
        className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <span className="max-w-[60%] truncate pl-2 text-sm font-medium text-white/80">
          {name || (isPdf ? 'Документ PDF' : '')}
        </span>
        <div className="flex items-center gap-2">
          {!isPdf && (
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
          )}
          <a
            href={url}
            download={name || true}
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
      </div>

      {isPdf ? (
        <div
          className="flex h-full w-full items-stretch justify-center p-2 pt-16 sm:p-4 sm:pt-16"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 3.75rem)' }}
        >
          <iframe
            src={url}
            title={name || 'PDF'}
            className="h-full w-full max-w-4xl rounded-xl bg-white"
          />
        </div>
      ) : (
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
      )}
    </div>
  );
}
