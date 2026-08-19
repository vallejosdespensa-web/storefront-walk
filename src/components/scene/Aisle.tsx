import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CategoryNode, Product } from "@/types";
import { useThumbArc } from "@/lib/useThumbArc";
import { useOnboarding, useReducedMotion } from "@/lib/useClient";

const STEP = 88;
const WINDOW = 5;

/**
 * Componente ÚNICO y recursivo del pasillo: recibe un nodo y renderiza sus hijos.
 * Sirve para cualquier profundidad del árbol; la góndola nunca cambia de escala.
 */
export function Aisle({
  node,
  trail,
  products,
  pulse,
  onEnterChild,
  onExit,
}: {
  node: CategoryNode;
  trail: string[];
  products: Product[];
  pulse: "in" | "out" | null;
  onEnterChild: (child: CategoryNode) => void;
  onExit: () => void;
}) {
  const children = useMemo(() => node.children ?? [], [node]);
  const reduced = useReducedMotion();
  const { hintOpacity, register } = useOnboarding("arc");
  const [active, setActive] = useState(0);
  const cardsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const gestureCounted = useRef(false);

  useEffect(() => {
    setActive(0);
    cardsRef.current.clear();
  }, [node.id]);

  const onFrame = useCallback((offset: number) => {
    cardsRef.current.forEach((el, i) => {
      const pos = i * STEP - offset;
      const ap = Math.abs(pos);
      el.style.transform = `translate3d(${pos * 0.16}px, ${pos}px, ${-ap * 1.15}px) rotateY(${16 - pos * 0.028}deg)`;
      el.style.opacity = `${Math.max(0, 1 - ap / 560)}`;
      el.style.zIndex = `${1000 - Math.round(ap)}`;
      el.style.pointerEvents = ap > 300 ? "none" : "auto";
      el.style.filter = ap > 120 ? `blur(${Math.min(3.5, (ap - 120) / 90)}px)` : "none";

    });
  }, []);

  const { bind, scrollToIndex } = useThumbArc({
    count: children.length,
    step: STEP,
    axis: { x: -0.3, y: 1 },
    reduced,
    onFrame,
    onIndexChange: (i) => {
      setActive(i);
      if (!gestureCounted.current) {
        gestureCounted.current = true;
        register();
      }
    },
    onEscape: onExit,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") scrollToIndex(active + 1);
      if (e.key === "ArrowUp") scrollToIndex(active - 1);
      if (e.key === "Escape") onExit();
      if (e.key === "Enter" && children[active]) onEnterChild(children[active]!);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, children, onEnterChild, onExit, scrollToIndex]);

  const activeChild = children[active];
  const thumbs = useMemo(() => {
    const ids = activeChild?.thumbnailProductIds ?? [];
    return ids
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => !!p && p.inStock)
      .slice(0, 4);
  }, [activeChild, products]);

  const visible = children
    .map((c, i) => ({ c, i }))
    .filter(({ i }) => Math.abs(i - active) <= WINDOW);

  return (
    <div
      className={`relative h-[100dvh] w-full overflow-hidden bg-scene ${pulse === "in" ? "pulse-in" : pulse === "out" ? "pulse-out" : ""}`}
    >
      {/* piso */}
      <div
        className="absolute inset-x-0 bottom-0 h-[38%]"
        style={{
          background:
            "linear-gradient(180deg, transparent, oklch(0.24 0.008 260)), radial-gradient(120% 60% at 20% 100%, oklch(0.28 0.01 260), transparent)",
        }}
        aria-hidden
      />

      {/* banda de gesto: tercio inferior completo */}
      <div
        {...bind}
        className="absolute inset-x-0 bottom-0 top-0 z-20 select-none"
        style={{ ...bind.style, perspective: "780px" }}
      >
        {/* góndola izquierda */}
        <div
          className="absolute left-6 top-[62%] h-0 w-[54%]"
          style={{ transformStyle: "preserve-3d" }}
        >
          {children.length === 0 && (
            <div className="absolute -top-16 w-full rounded-lg bg-panel px-4 py-6 text-sm text-scene-dim">
              Todavía no hay nada en esta góndola.
            </div>
          )}
          {visible.map(({ c, i }) => (
            <div
              key={c.id}
              ref={(el) => {
                if (el) cardsRef.current.set(i, el);
                else cardsRef.current.delete(i);
              }}
              onClick={() => (i === active ? onEnterChild(c) : scrollToIndex(i))}
              className={`absolute left-0 top-[-34px] h-[68px] w-full cursor-pointer rounded-md bg-panel px-3 py-2 will-change-transform ${i === active ? "glow-active" : ""}`}
              style={{ transformStyle: "preserve-3d" }}
            >

              <p className="truncate text-sm text-scene-fg">{c.name}</p>
              <p className="text-[11px] text-scene-dim">
                {c.children?.length ? `${c.children.length} subcategorías` : "Ver marcas"}
              </p>
            </div>
          ))}
        </div>

        {/* trazo de onboarding: arco del pulgar */}
        {hintOpacity > 0 && !reduced && (
          <svg
            className="pointer-events-none absolute bottom-[6%] right-[6%] h-40 w-40"
            viewBox="0 0 100 100"
            style={{ opacity: hintOpacity * 0.55 }}
            aria-hidden
          >
            <path
              d="M78 14 C 46 30, 26 56, 22 88"
              fill="none"
              stroke="currentColor"
              className="text-scene-fg"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="200"
              style={{ animation: "arc-trace 1800ms ease-in-out infinite" }}
            />
          </svg>
        )}
      </div>

      {/* rastro + card flotante (la aguja es su vértice superior izquierdo) */}
      <div className="pointer-events-none absolute left-[42%] right-4 top-[62%] z-30">
        <p className="pointer-events-none absolute -top-6 left-0 truncate text-[12px] text-scene-dim">
          {trail.join(" › ")}
        </p>
        <button
          onClick={() => activeChild && onEnterChild(activeChild)}
          disabled={!activeChild}
          className="press tap-44 glow-active pointer-events-auto w-full rounded-2xl bg-panel p-3 text-left disabled:opacity-50"
        >
          <span key={activeChild?.id ?? "none"} className="crossfade block">
            <span className="block truncate text-base font-medium text-scene-fg">
              {activeChild?.name ?? "Sin contenido"}
            </span>
            <span className="relative mt-3 block h-16">
              {thumbs.map((p, k) => (
                <span
                  key={p.id}
                  className="absolute block h-14 w-12 rounded-md"
                  style={{
                    backgroundColor: p.color,
                    left: `${k * 26}px`,
                    top: `${(k % 2) * 6}px`,
                    transform: `rotate(${(k - 1.5) * 7}deg)`,
                  }}
                />
              ))}
            </span>
            <span className="mt-1 block text-[11px] text-scene-dim">Tocá para entrar</span>
          </span>
        </button>
      </div>

      {/* controles visibles (desktop / accesibilidad) */}
      <div className="absolute bottom-5 left-4 z-40 flex gap-2">
        <button
          onClick={onExit}
          aria-label="Volver"
          className="press tap-44 grid place-items-center rounded-full bg-panel p-3 text-scene-fg"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => activeChild && onEnterChild(activeChild)}
          aria-label="Entrar"
          className="press tap-44 grid place-items-center rounded-full bg-panel p-3 text-scene-fg"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
