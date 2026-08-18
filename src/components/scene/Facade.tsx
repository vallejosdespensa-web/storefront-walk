import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronsDown, Star } from "lucide-react";
import { useTenant } from "@/store/useTenant";
import { useNavigation } from "@/store/useNavigation";
import { useMounted, useOnboarding, useReducedMotion } from "@/lib/useClient";
import { formatPrice, pickProducts } from "@/lib/tree";

function skyGradient(hour: number) {
  // interpolación continua entre noche, día y atardecer según la hora exacta
  const day = [
    [0, [16, 20, 34], [26, 32, 52]],
    [6, [58, 62, 92], [128, 122, 132]],
    [9, [92, 122, 168], [176, 198, 224]],
    [15, [96, 130, 176], [186, 204, 226]],
    [19, [178, 106, 78], [92, 74, 96]],
    [21, [40, 40, 66], [30, 32, 50]],
    [24, [16, 20, 34], [26, 32, 52]],
  ] as [number, number[], number[]][];
  let a = day[0]!;
  let b = day[day.length - 1]!;
  for (let i = 0; i < day.length - 1; i++) {
    if (hour >= day[i]![0] && hour <= day[i + 1]![0]) {
      a = day[i]!;
      b = day[i + 1]!;
      break;
    }
  }
  const t = (hour - a[0]) / Math.max(0.001, b[0] - a[0]);
  const mix = (x: number[], y: number[]) =>
    `rgb(${x.map((v, i) => Math.round(v + (y[i]! - v) * t)).join(",")})`;
  return `linear-gradient(180deg, ${mix(a[1], b[1])} 0%, ${mix(a[2], b[2])} 100%)`;
}

export function Facade() {
  const tenant = useTenant((s) => s.tenant);
  const goToLevel = useNavigation((s) => s.goToLevel);
  const mounted = useMounted();
  const reduced = useReducedMotion();
  const { hintOpacity, register } = useOnboarding("enter");
  const [showOffers, setShowOffers] = useState(false);

  const sceneRef = useRef<HTMLDivElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const uiRef = useRef<HTMLDivElement | null>(null);
  const progress = useRef(0);
  const raf = useRef<number | null>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startP = useRef(0);
  const settle = useRef<{ from: number; to: number; t0: number } | null>(null);

  const offers = useMemo(
    () => (tenant ? pickProducts(tenant.products, tenant.offerProductIds) : []),
    [tenant],
  );

  const sky = useMemo(() => {
    if (!mounted) return "linear-gradient(180deg, rgb(30,34,52), rgb(44,50,70))";
    const d = new Date();
    return skyGradient(d.getHours() + d.getMinutes() / 60);
  }, [mounted]);

  const paint = useCallback(() => {
    const p = progress.current;
    if (layerRef.current) {
      layerRef.current.style.transform = `translateZ(${p * 320}px) scale(${1 + p * 0.85})`;
      layerRef.current.style.opacity = `${1 - p * 0.85}`;
    }
    if (uiRef.current) uiRef.current.style.opacity = `${Math.max(0, 1 - p * 2)}`;
  }, []);

  const tick = useCallback(() => {
    raf.current = null;
    if (dragging.current) {
      paint();
      raf.current = requestAnimationFrame(tick);
      return;
    }
    const s = settle.current;
    if (s) {
      const t = Math.min(1, (performance.now() - s.t0) / 520);
      const e = 1 - Math.pow(1 - t, 3);
      progress.current = s.from + (s.to - s.from) * e;
      paint();
      if (t >= 1) {
        settle.current = null;
        if (progress.current >= 0.999) {
          register();
          goToLevel("salon");
        }
        return;
      }
      raf.current = requestAnimationFrame(tick);
    }
  }, [goToLevel, paint, register]);

  const ensure = useCallback(() => {
    if (raf.current === null) raf.current = requestAnimationFrame(tick);
  }, [tick]);

  const advance = useCallback(
    (delta: number) => {
      settle.current = null;
      progress.current = Math.max(0, Math.min(1, progress.current + delta));
      paint();
      if (progress.current >= 1) {
        if (reduced) {
          register();
          goToLevel("salon");
          return;
        }
        settle.current = { from: 1, to: 1, t0: performance.now() - 520 };
        ensure();
      }
    },
    [ensure, goToLevel, paint, reduced, register],
  );

  const release = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    const p = progress.current;
    if (reduced) {
      if (p > 0.4) {
        register();
        goToLevel("salon");
      } else {
        progress.current = 0;
        paint();
      }
      return;
    }
    settle.current = { from: p, to: p > 0.4 ? 1 : 0, t0: performance.now() };
    ensure();
  }, [ensure, goToLevel, paint, reduced, register]);

  useEffect(() => {
    const el = sceneRef.current;
    if (!el || !mounted) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
      advance((e.deltaY * unit) / 700);
      if (progress.current > 0 && progress.current < 1) {
        settle.current = null;
        window.clearTimeout(wheelSettle.current);
        wheelSettle.current = window.setTimeout(() => {
          settle.current = {
            from: progress.current,
            to: progress.current > 0.4 ? 1 : 0,
            t0: performance.now(),
          };
          ensure();
        }, 140);
      }
    };
    const wheelSettle = { current: 0 };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.clearTimeout(wheelSettle.current);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [advance, ensure, mounted]);

  const stars = tenant ? Math.round(tenant.rating) : 0;

  return (
    <div
      ref={sceneRef}
      className="relative h-[100dvh] w-full overflow-hidden bg-scene"
      style={{ perspective: "1000px", touchAction: "none" }}
      onPointerDown={(e) => {
        if (!mounted) return;
        settle.current = null;
        dragging.current = true;
        startY.current = e.clientY;
        startP.current = progress.current;
        ensure();
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        progress.current = Math.max(
          0,
          Math.min(1, startP.current + (startY.current - e.clientY) / 380),
        );
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div className="absolute inset-0" style={{ background: sky }} aria-hidden />

      <div
        ref={layerRef}
        className="absolute inset-0 will-change-transform"
        style={{ transformStyle: "preserve-3d" }}
      >
        {tenant?.facadeImageUrl ? (
          <img
            src={tenant.facadeImageUrl}
            alt={`Frente de ${tenant.name}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-x-0 bottom-0 top-[28%]">
            <div className="absolute inset-0 bg-panel" />
            <div className="absolute inset-x-[12%] bottom-0 top-[26%] rounded-t-sm bg-scene/80" />
            <div className="absolute inset-x-[38%] bottom-0 top-[46%] bg-scene" />
          </div>
        )}
      </div>

      <div ref={uiRef} className="absolute inset-0 flex flex-col justify-between p-4 pb-8 pt-20">
        <h1 className="text-center text-3xl font-semibold tracking-tight text-scene-fg drop-shadow">
          {tenant?.name ?? ""}
        </h1>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl bg-panel/70 px-4 py-3 text-xs text-scene-fg backdrop-blur">
            <span className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={13}
                  className={i < stars ? "fill-current" : "opacity-30"}
                  aria-hidden
                />
              ))}
              <span className="ml-1 tabular-nums">{tenant?.rating ?? ""}</span>
            </span>
            {tenant && <span>{tenant.isOpen ? "Abierto ahora" : "Cerrado"}</span>}
            <span className="text-scene-dim">{tenant?.paymentMethods.join(" · ")}</span>
          </div>

          <button
            onClick={() => setShowOffers((v) => !v)}
            className="press tap-44 w-full rounded-xl bg-panel/80 py-4 text-sm font-medium text-scene-fg backdrop-blur"
          >
            Ver ofertas
          </button>

          {showOffers && (
            <div className="crossfade -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
              {offers.map((p) => (
                <div
                  key={p.id}
                  className="w-36 shrink-0 snap-start rounded-xl bg-panel/85 p-3 backdrop-blur"
                >
                  <div
                    className="mb-2 h-20 rounded-lg"
                    style={{ backgroundColor: p.color }}
                    aria-hidden
                  />
                  <p className="truncate text-xs text-scene-fg">{p.name}</p>
                  <p className="text-xs tabular-nums text-scene-dim">
                    {formatPrice(p.variants[0]?.price ?? 0)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div
            className="flex flex-col items-center gap-1 pt-1 text-scene-fg"
            style={{ opacity: 0.4 + hintOpacity * 0.6 }}
          >
            <ChevronsDown
              size={22}
              style={{ animation: "chevron-beat 1.4s ease-in-out infinite" }}
              aria-hidden
            />
            <span className="text-[11px] uppercase tracking-widest">scroll</span>
          </div>
        </div>
      </div>
    </div>
  );
}
