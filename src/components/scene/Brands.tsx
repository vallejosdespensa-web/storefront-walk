import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { Brand } from "@/types";
import { useThumbArc } from "@/lib/useThumbArc";
import { useReducedMotion } from "@/lib/useClient";

const STEP = 118;

export function Brands({
  brands,
  trail,
  onSelect,
  onExit,
}: {
  brands: Brand[];
  trail: string[];
  onSelect: (brandId: string) => void;
  onExit: () => void;
}) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onFrame = useCallback((offset: number) => {
    const els = refs.current;
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      if (!el) continue;
      const d = (i * STEP - offset) / STEP;
      const ad = Math.abs(d);
      // disposición ovalada: los extremos se comprimen en X y se hunden en Z
      el.style.transform = `translate3d(${d * 108 * (1 - Math.min(0.55, ad * 0.14))}px, ${ad * ad * 6}px, ${-ad * 150}px) scale(${Math.max(0.45, 1 - ad * 0.16)})`;
      el.style.opacity = `${Math.max(0, 1 - ad * 0.26)}`;
      el.style.filter = ad > 0.8 ? `blur(${Math.min(4, (ad - 0.8) * 2.2)}px)` : "none";
      el.style.zIndex = `${100 - Math.round(ad * 10)}`;
    }
  }, []);

  const { bind, scrollToIndex } = useThumbArc({
    count: brands.length,
    step: STEP,
    axis: { x: -1, y: 0 },
    reduced,
    onFrame,
    onIndexChange: setActive,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") scrollToIndex(active + 1);
      if (e.key === "ArrowLeft") scrollToIndex(active - 1);
      if (e.key === "Escape") onExit();
      if (e.key === "Enter" && brands[active]) onSelect(brands[active]!.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, brands, onExit, onSelect, scrollToIndex]);

  const label = useMemo(() => trail.join(" › "), [trail]);

  return (
    <div className="relative flex h-[100dvh] flex-col justify-end overflow-hidden bg-scene pb-24">
      <p className="px-4 pb-2 text-[12px] text-scene-dim">{label}</p>

      {brands.length === 0 ? (
        <p className="px-4 pb-16 text-sm text-scene-dim">No hay marcas cargadas todavía.</p>
      ) : (
        <div
          {...bind}
          className="eye-mask relative h-[42dvh] w-full select-none"
          style={{ ...bind.style, perspective: "900px" }}
        >
          <div className="absolute left-1/2 top-1/2" style={{ transformStyle: "preserve-3d" }}>
            {brands.map((b, i) => (
              <button
                key={b.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                onClick={() => (i === active ? onSelect(b.id) : scrollToIndex(i))}
                className={`tap-44 absolute -left-[62px] -top-[40px] grid h-[80px] w-[124px] place-items-center rounded-xl bg-panel px-3 text-center text-sm text-scene-fg will-change-transform ${i === active ? "glow-active" : ""}`}
              >
                {b.logoUrl ? (
                  <img src={b.logoUrl} alt={b.name} className="max-h-10 object-contain" />
                ) : (
                  <span className="truncate">{b.name}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onExit}
        aria-label="Volver"
        className="press tap-44 absolute bottom-5 left-4 grid place-items-center rounded-full bg-panel p-3 text-scene-fg"
      >
        <ChevronLeft size={18} />
      </button>
    </div>
  );
}
