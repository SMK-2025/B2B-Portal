"use client";
import { NetworkText } from "./network-text-editor";
import { Children, useEffect, useRef, useState, type ReactNode } from "react";

export function NetworkBoardPager({
  children,
  empty,
}: {
  children: ReactNode;
  empty: ReactNode;
}) {
  const root = useRef<HTMLElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const [size, setSize] = useState(1),
    [first, setFirst] = useState(0);
  const cards = Children.toArray(children);
  const pages = Math.max(1, Math.ceil(cards.length / size));
  const page = Math.min(pages - 1, Math.floor(first / size));
  function go(next: number) {
    setFirst(Math.min(pages - 1, Math.max(0, next)) * size);
  }
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    function measure(width: number) {
      setSize(width >= 1200 ? 4 : width >= 900 ? 3 : width >= 600 ? 2 : 1);
    }
    measure(el.clientWidth);
    const observer = new ResizeObserver(([entry]) =>
      measure(entry.contentRect.width),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <section
      className="networkBoardPager"
      ref={root}
      aria-label="Beiträge am Schwarzen Brett"
    >
      <div
        className="loungeBoardSurface boardPagedSurface"
        style={{ gridTemplateColumns: `repeat(${size},minmax(0,1fr))` }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          start.current =
            size === 1 && e.touches.length === 1
              ? { x: t.clientX, y: t.clientY }
              : null;
        }}
        onTouchCancel={() => {
          start.current = null;
        }}
        onTouchEnd={(e) => {
          const p = start.current;
          start.current = null;
          if (!p) return;
          const t = e.changedTouches[0],
            dx = t.clientX - p.x,
            dy = t.clientY - p.y;
          if (Math.abs(dx) > 45 && Math.abs(dx) > 1.5 * Math.abs(dy)) {
            suppressClickUntil.current = Date.now() + 400;
            go(page + (dx < 0 ? 1 : -1));
          }
        }}
        onClickCapture={(e) => {
          if (Date.now() < suppressClickUntil.current) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
      >
        {cards.length ? cards.slice(page * size, (page + 1) * size) : empty}
      </div>
      {pages > 1 && (
        <nav className="boardPageNav" aria-label="Beitragsseiten">
          <button
            type="button"
            aria-label="Vorherige Beitragsseite"
            disabled={!page}
            onClick={() => go(page - 1)}
          >
            ←
          </button>
          <span aria-live="polite" aria-atomic="true">
            <NetworkText id="ui.network-board-pager.e45a825b2f9a31d0">
              Seite{" "}
            </NetworkText>
            {page + 1}
            <NetworkText id="ui.network-board-pager.43ce6022b9318e93">
              von{" "}
            </NetworkText>
            {pages}
          </span>
          <button
            type="button"
            aria-label="Nächste Beitragsseite"
            disabled={page === pages - 1}
            onClick={() => go(page + 1)}
          >
            →
          </button>
        </nav>
      )}
    </section>
  );
}
