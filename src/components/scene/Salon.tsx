import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTenant } from "@/store/useTenant";
import { useNavigation } from "@/store/useNavigation";
import { useThumbArc } from "@/lib/useThumbArc";
import { useReducedMotion } from "@/lib/useClient";
import { pickProducts } from "@/lib/tree";

const STEP = 130;

export function Salon({ onEnterNode }: { onEnterNode: (id: string) => void }) {
  const tenant = useTenant((s) => s.tenant);
  const salonIndex = useNavigation((s) => s.salonIndex);
  const setSalonIndex = useNavigation((s) => s.setSalonIndex);
  const reduced = useReducedMotion();

  const categories = useMemo(() => tenant?.categories ?? [], [tenant]);
  const stacked = useMemo(() => tenant?.stackedCategories ?? [], [tenant]);
  const products = useMemo(() => tenant?.products ?? [], [tenant]);

  const [active, setActive] = useState(salonIndex);
  const nodesRef = useRef<(HTMLDivElement | null)[]>([]);

  const onFrame = useCallback((offset: number) => {
    const els = nodesRef.current;
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      if (!el) continue;
      const d = (i * STEP - offset) / STEP;
      const ad = Math.abs(d);
      el.style.transform = `translate3d(${d * 132}px, 0, ${-ad * 210}px) rotateY(${-d * 34}deg) scale(${Math.max(0.4, 1 - ad * 0.1)})`;
      el.style.opacity = `${Math.max(0, 1 - ad * 0.3)}`;
      el.style.zIndex = `${100 - Math.round(ad * 10)}`;
      el.style.filter = ad > 0.6 ? `blur(${Math.min(3, (ad - 0.6) * 2.4)}px)` : "none";
    }
  }, []);

  const { bind, scrollToIndex } = useThumbArc({
    count: categories.length,
    step: STEP,
    axis: { x: -1, y: 0 },
    reduced,
    onFrame,
    onIndexChange: (i) => {
      setActive(i);
      setSalonIndex(i);
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") scrollToIndex(active + 1);
      if (e.key === "ArrowLeft") scrollToIndex(active - 1);
      if (e.key === "Enter" && categories[active]) onEnterNode(categories[active]!.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, categories, onEnterNode, scrollToIndex]);

  return (
    <div className="flex h-[100dvh] flex-col justify-end overflow-hidden bg-scene pb-6 pt-16">
      <div
        {...bind}
        className="relative h-[46dvh] w-full select-none"
        style={{ ...bind.style, perspective: "1100px" }}
      >
        <div
          className="absolute left-1/2 top-1/2 h-0 w-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          {categories.map((cat, i) => {
            const thumbs = pickProducts(products, cat.thumbnailProductIds).slice(0, 4);
            return (
              <div
                key={cat.id}
                ref={(el) => {
                  nodesRef.current[i] = el;
                }}
                onClick={() => (i === active ? onEnterNode(cat.id) : scrollToIndex(i))}
                className="absolute -left-[70px] -top-[130px] h-[260px] w-[140px] will-change-transform"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div
                  className={`flex h-full w-full flex-col justify-end gap-1 rounded-lg bg-panel p-2 ${i === active ? "glow-active" : ""}`}
                >
                  {[0, 1, 2].map((shelf) => (
                    <div key={shelf} className="flex flex-1 items-end gap-1 border-b border-line pb-1">
                      {thumbs.map((p, k) => (
                        <div
                          key={`${p.id}-${k}`}
                          className="flex-1 rounded-sm"
                          style={{
                            backgroundColor: p.color,
                            height: `${52 + ((k + shelf) % 3) * 8}%`,
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-center text-xs text-scene-fg">{cat.name}</p>
              </div>
            );
          })}
        </div>
      </div>

      <p className="py-2 text-center text-[11px] uppercase tracking-[0.3em] text-scene-dim">
        {"<< swipe >>"}
      </p>

      <div className="space-y-2 px-4">
        {stacked.map((node) => (
          <button
            key={node.id}
            onClick={() => onEnterNode(node.id)}
            className="press tap-44 w-full rounded-xl bg-panel px-4 py-3 text-left text-sm text-scene-fg"
          >
            {node.name}
          </button>
        ))}
      </div>
    </div>
  );
}
