import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "@/types";
import { useThumbArc } from "@/lib/useThumbArc";
import { useReducedMotion } from "@/lib/useClient";

const STEP = 150;

/** Carrusel de productos: uno al centro completo + dos a cada lado en perspectiva. */
export function ProductCarousel({
  products,
  onActiveChange,
}: {
  products: Product[];
  onActiveChange?: (index: number) => void;
}) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  const onFrame = useCallback((offset: number) => {
    const els = refs.current;
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      if (!el) continue;
      const d = (i * STEP - offset) / STEP;
      const ad = Math.abs(d);
      el.style.transform = `translate3d(${d * 150}px, 0, ${-ad * 180}px) rotateY(${-d * 30}deg) scale(${Math.max(0.4, 1 - ad * 0.18)})`;
      el.style.opacity = `${Math.max(0, 1 - ad * 0.34)}`;
      el.style.zIndex = `${100 - Math.round(ad * 10)}`;
      el.style.filter = ad > 0.7 ? `blur(${Math.min(3, (ad - 0.7) * 2)}px)` : "none";
    }
  }, []);

  const { bind, scrollToIndex } = useThumbArc({
    count: products.length,
    step: STEP,
    axis: { x: -1, y: 0 },
    reduced,
    onFrame,
    onIndexChange: (i) => {
      setActive(i);
      onActiveChange?.(i);
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") scrollToIndex(active + 1);
      if (e.key === "ArrowLeft") scrollToIndex(active - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, scrollToIndex]);

  return (
    <div
      {...bind}
      className="relative h-[34dvh] w-full select-none"
      style={{ ...bind.style, perspective: "1000px" }}
    >
      <div className="absolute left-1/2 top-1/2" style={{ transformStyle: "preserve-3d" }}>
        {products.map((p, i) => (
          <div
            key={p.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            onClick={() => scrollToIndex(i)}
            className={`absolute -left-[80px] -top-[110px] h-[220px] w-[160px] overflow-hidden rounded-xl bg-panel p-2 will-change-transform ${i === active ? "glow-active" : ""}`}
          >
            <div
              className="h-[150px] w-full rounded-lg"
              style={{ backgroundColor: p.color }}
              aria-hidden
            />
            <p className="mt-2 line-clamp-2 text-xs text-scene-fg">{p.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
