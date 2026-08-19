import { useCallback, useEffect, useRef, useState } from "react";

export interface ThumbArcOptions {
  /** cantidad de items */
  count: number;
  /** píxeles de recorrido por item */
  step: number;
  /** dirección de movimiento del dedo que AVANZA (vector, se normaliza) */
  axis?: { x: number; y: number };
  /** se llama SOLO cuando cambia el item activo */
  onIndexChange?: (index: number) => void;
  /** se llama en cada frame de movimiento, para escribir transforms por ref */
  onFrame?: (offset: number, index: number) => void;
  /** al soltar un arco inverso más allá del inicio */
  onEscape?: () => void;
  reduced?: boolean;
  enabled?: boolean;
}

const FRICTION = 0.94;
const MIN_VELOCITY = 0.15;
const ESCAPE_THRESHOLD = 56;
const RUBBER = 0.35;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
/** aproximación de cubic-bezier(0.34, 1.4, 0.64, 1): rebote elástico */
function easeOutBack(t: number) {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function useThumbArc({
  count,
  step,
  axis = { x: 0, y: 1 },
  onIndexChange,
  onFrame,
  onEscape,
  reduced = false,
  enabled = true,
}: ThumbArcOptions) {
  const offsetRef = useRef(0);
  const indexRef = useRef(0);
  const velocityRef = useRef(0);
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const samplesRef = useRef<{ t: number; p: number }[]>([]);
  const startRef = useRef({ x: 0, y: 0, offset: 0 });
  const lastProjRef = useRef(0);
  const snapRef = useRef<{ from: number; to: number; start: number; dur: number; back: boolean } | null>(
    null,
  );
  const elRef = useRef<HTMLDivElement | null>(null);
  const escapedRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const cbRef = useRef({ onIndexChange, onFrame, onEscape, count, step, axis, reduced });
  cbRef.current = { onIndexChange, onFrame, onEscape, count, step, axis, reduced };

  const maxOffset = () => Math.max(0, (cbRef.current.count - 1) * cbRef.current.step);

  const emit = useCallback(() => {
    const { step: s, count: c, onFrame: f, onIndexChange: oi, reduced: red } = cbRef.current;
    const raw = s > 0 ? offsetRef.current / s : 0;
    const idx = Math.max(0, Math.min(c - 1, Math.round(raw)));
    if (idx !== indexRef.current) {
      indexRef.current = idx;
      if (!red && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(8);
      }
      oi?.(idx);
    }
    f?.(offsetRef.current, idx);
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    rafRef.current = null;
    const max = maxOffset();

    if (draggingRef.current) {
      emit();
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const snap = snapRef.current;
    if (snap) {
      const now = performance.now();
      const t = Math.min(1, (now - snap.start) / snap.dur);
      const e = snap.back ? easeOutBack(t) : easeOutCubic(t);
      offsetRef.current = snap.from + (snap.to - snap.from) * e;
      emit();
      if (t >= 1) {
        offsetRef.current = snap.to;
        snapRef.current = null;
        emit();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    // inercia
    if (Math.abs(velocityRef.current) > MIN_VELOCITY) {
      offsetRef.current += velocityRef.current;
      velocityRef.current *= FRICTION;
      if (offsetRef.current < 0 || offsetRef.current > max) {
        velocityRef.current *= 0.5;
        offsetRef.current = Math.max(-40, Math.min(max + 40, offsetRef.current));
      }
      emit();
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    velocityRef.current = 0;
    startSnap();
  }, [emit]);

  const ensureLoop = useCallback(() => {
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const startSnap = useCallback(() => {
    const { step: s, count: c, reduced: red } = cbRef.current;
    const max = Math.max(0, (c - 1) * s);
    const target = Math.max(0, Math.min(max, Math.round(offsetRef.current / (s || 1)) * s));
    const out = offsetRef.current < -1 || offsetRef.current > max + 1;
    if (Math.abs(target - offsetRef.current) < 0.5) {
      offsetRef.current = target;
      emit();
      return;
    }
    if (red) {
      offsetRef.current = target;
      emit();
      return;
    }
    snapRef.current = {
      from: offsetRef.current,
      to: target,
      start: performance.now(),
      dur: out ? 260 : 300,
      back: out,
    };
    ensureLoop();
  }, [emit, ensureLoop]);

  const project = (dx: number, dy: number) => {
    const a = cbRef.current.axis;
    const len = Math.hypot(a.x, a.y) || 1;
    const ux = a.x / len;
    const uy = a.y / len;
    return dx * ux + dy * uy;
  };

  const winHandlersRef = useRef<null | {
    move: (e: PointerEvent) => void;
    up: (e: PointerEvent) => void;
  }>(null);

  const detachWindow = useCallback(() => {
    const h = winHandlersRef.current;
    if (!h) return;
    winHandlersRef.current = null;
    window.removeEventListener("pointermove", h.move);
    window.removeEventListener("pointerup", h.up);
    window.removeEventListener("pointercancel", h.up);
  }, []);

  const attachWindow = useCallback(() => {
    detachWindow();
    const h = {
      move: (e: PointerEvent) => moveRef.current(e),
      up: () => endRef.current(),
    };
    winHandlersRef.current = h;
    window.addEventListener("pointermove", h.move, { passive: true });
    window.addEventListener("pointerup", h.up);
    window.addEventListener("pointercancel", h.up);
  }, [detachWindow]);

  const moveRef = useRef<(e: PointerEvent) => void>(() => {});
  const endRef = useRef<() => void>(() => {});

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      // interrumpe cualquier animación en curso, en el punto exacto
      snapRef.current = null;
      velocityRef.current = 0;
      stopLoop();
      draggingRef.current = true;
      escapedRef.current = false;
      setIsDragging(true);
      startRef.current = { x: e.clientX, y: e.clientY, offset: offsetRef.current };
      lastProjRef.current = 0;
      samplesRef.current = [{ t: performance.now(), p: 0 }];
      attachWindow();
      ensureLoop();
    },
    [enabled, ensureLoop, stopLoop],
  );

  const onPointerMove = useCallback((e: React.PointerEvent | PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    const proj = project(dx, dy);
    const mag = Math.hypot(dx, dy);
    // tolerancia de arco: descartar solo si el ángulo se sale de un rango amplio
    if (mag > 8 && Math.abs(proj) / mag < 0.25) return;

    const max = maxOffset();
    let next = startRef.current.offset + proj;
    if (next < 0) next = next * RUBBER;
    else if (next > max) next = max + (next - max) * RUBBER;
    offsetRef.current = next;
    if (next < -ESCAPE_THRESHOLD) escapedRef.current = true;

    const now = performance.now();
    samplesRef.current.push({ t: now, p: proj });
    if (samplesRef.current.length > 4) samplesRef.current.shift();
    lastProjRef.current = proj;
  }, []);

  const endDrag = useCallback(() => {
    detachWindow();
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);

    // velocidad = promedio de los últimos 3 movimientos, en px/frame
    const s = samplesRef.current;
    let v = 0;
    let n = 0;
    for (let i = s.length - 1; i > 0 && n < 3; i--, n++) {
      const a = s[i]!;
      const b = s[i - 1]!;
      const dt = Math.max(1, a.t - b.t);
      v += ((a.p - b.p) / dt) * 16.67;
    }

    v = n > 0 ? v / n : 0;
    velocityRef.current = cbRef.current.reduced ? 0 : Math.max(-60, Math.min(60, v));

    if (escapedRef.current) {
      escapedRef.current = false;
      velocityRef.current = 0;
      offsetRef.current = 0;
      emit();
      cbRef.current.onEscape?.();
      return;
    }
    ensureLoop();
  }, [emit, ensureLoop]);

  // rueda del mouse: mismo eje de profundidad
  const wheelTimer = useRef<number | null>(null);
  useEffect(() => {
    const el = elRef.current;
    if (!el || !enabled) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      snapRef.current = null;
      velocityRef.current = 0;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
      const a = cbRef.current.axis;
      const horizontal = Math.abs(a.x) > Math.abs(a.y);
      const raw = horizontal
        ? (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * unit
        : e.deltaY * unit;
      const dir = horizontal ? (a.x < 0 ? 1 : -1) : a.y >= 0 ? 1 : -1;
      const max = maxOffset();
      offsetRef.current = Math.max(-30, Math.min(max + 30, offsetRef.current + raw * 0.6 * dir));
      emit();
      if (wheelTimer.current) window.clearTimeout(wheelTimer.current);
      wheelTimer.current = window.setTimeout(() => {
        if (offsetRef.current < -ESCAPE_THRESHOLD / 2) {
          offsetRef.current = 0;
          emit();
          cbRef.current.onEscape?.();
          return;
        }
        startSnap();
      }, 110);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [emit, enabled, startSnap]);

  useEffect(() => {
    emit();
    return () => {
      stopLoop();
      if (wheelTimer.current) window.clearTimeout(wheelTimer.current);
    };
  }, [emit, stopLoop]);

  /** mover a un índice concreto (flechas de teclado, botones desktop) */
  const scrollToIndex = useCallback(
    (i: number) => {
      const { step: s, count: c } = cbRef.current;
      const target = Math.max(0, Math.min(c - 1, i)) * s;
      snapRef.current = cbRef.current.reduced
        ? null
        : { from: offsetRef.current, to: target, start: performance.now(), dur: 300, back: false };
      if (cbRef.current.reduced) {
        offsetRef.current = target;
        emit();
      } else ensureLoop();
    },
    [emit, ensureLoop],
  );

  moveRef.current = onPointerMove as (e: PointerEvent) => void;
  endRef.current = endDrag;

  const bind = {
    ref: elRef,
    onPointerDown,
    style: { touchAction: "none" as const },
  };

  return { offsetRef, indexRef, isDragging, bind, scrollToIndex, onIndexChange };
}
