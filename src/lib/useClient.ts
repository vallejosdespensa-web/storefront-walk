import { useEffect, useState } from "react";

/** gate de cliente: nada que toque window/document corre antes de esto */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

const KEY = "wl-onboarding-v1";

/** cuenta cuántas veces se ejecutó bien cada gesto; se atenúa y desaparece a la 3ra */
export function useOnboarding(gesture: string) {
  const [count, setCount] = useState(3);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      const data = raw ? (JSON.parse(raw) as Record<string, number>) : {};
      setCount(data[gesture] ?? 0);
    } catch {
      setCount(0);
    }
  }, [gesture]);

  const register = () => {
    setCount((c) => {
      const next = Math.min(3, c + 1);
      try {
        const raw = window.localStorage.getItem(KEY);
        const data = raw ? (JSON.parse(raw) as Record<string, number>) : {};
        data[gesture] = next;
        window.localStorage.setItem(KEY, JSON.stringify(data));
      } catch {
        /* noop */
      }
      return next;
    });
  };

  return { hintOpacity: Math.max(0, 1 - count / 3), done: count >= 3, register };
}
