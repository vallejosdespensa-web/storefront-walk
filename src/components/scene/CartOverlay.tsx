import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useCart } from "@/store/useCart";
import { useTenant } from "@/store/useTenant";
import { formatPrice } from "@/lib/tree";
import { ProductCarousel } from "./ProductCarousel";
import type { Product } from "@/types";

/** Carrito que aparece al pie en picado diagonal cuando se agrega algo, y se retira. */
export function CartDrop() {
  const items = useCart((s) => s.items);
  const lastAddedAt = useCart((s) => s.lastAddedAt);
  const tenantProducts = useTenant((s) => s.tenant?.products);
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!lastAddedAt) return;
    setVisible(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setVisible(false), 1200);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [lastAddedAt]);

  const piled = useMemo(() => {
    const list = tenantProducts ?? [];
    return items
      .slice(-6)
      .map((i) => list.find((p) => p.id === i.productId))
      .filter((p): p is Product => !!p);
  }, [items, tenantProducts]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-2"
      style={{ animation: "cart-drop 1200ms cubic-bezier(0.2,0.8,0.2,1) forwards", perspective: "600px" }}
      aria-hidden
    >
      <div
        className="relative h-28 w-64 rounded-t-xl bg-panel"
        style={{ transform: "rotateX(52deg) rotateZ(-8deg)", transformStyle: "preserve-3d" }}
      >
        {piled.map((p, k) => (
          <span
            key={`${p.id}-${k}`}
            className="absolute block h-10 w-9 rounded-sm"
            style={{
              backgroundColor: p.color,
              left: `${18 + ((k * 37) % 160)}px`,
              top: `${20 + ((k * 23) % 46)}px`,
              transform: `rotate(${((k * 47) % 40) - 20}deg)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function CartView() {
  const open = useCart((s) => s.open);
  const setOpen = useCart((s) => s.setOpen);
  const items = useCart((s) => s.items);
  const total = useCart((s) => s.total);
  const remove = useCart((s) => s.remove);
  const tenantProducts = useTenant((s) => s.tenant?.products);

  const products = useMemo(() => {
    const list = tenantProducts ?? [];
    return items
      .map((i) => list.find((p) => p.id === i.productId))
      .filter((p): p is Product => !!p);
  }, [items, tenantProducts]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-scene/70 backdrop-blur-md">
      <button
        onClick={() => setOpen(false)}
        aria-label="Cerrar carrito"
        className="press tap-44 absolute right-4 top-4 grid place-items-center rounded-full bg-panel p-3 text-scene-fg"
      >
        <X size={18} />
      </button>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <p className="text-sm text-scene-dim">Tu carrito está vacío.</p>
          <button
            onClick={() => setOpen(false)}
            className="press tap-44 rounded-xl bg-panel px-5 py-3 text-sm text-scene-fg"
          >
            Volver al salón
          </button>
        </div>
      ) : (
        <div className="pb-8">
          <ProductCarousel products={products} />
          <div className="mt-2 max-h-[26dvh] overflow-y-auto px-4">
            {items.map((i) => {
              const p = products.find((pr) => pr.id === i.productId);
              return (
                <div
                  key={i.id}
                  className="flex items-center justify-between border-b border-line py-3 text-sm"
                >
                  <span className="truncate text-scene-fg">
                    {p?.name} · <span className="text-scene-dim">{i.variantLabel}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums text-scene-fg">{formatPrice(i.price)}</span>
                    <button
                      onClick={() => remove(i.id)}
                      className="press tap-44 text-xs text-scene-dim"
                    >
                      Quitar
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between px-4 pt-4 text-base text-scene-fg">
            <span>Total</span>
            <span className="tabular-nums">{formatPrice(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
