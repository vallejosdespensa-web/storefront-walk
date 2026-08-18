import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/tree";
import { ProductCarousel } from "./ProductCarousel";
import { useCart } from "@/store/useCart";

export function ProductLevel({
  products,
  trail,
  pulse,
  onExit,
}: {
  products: Product[];
  trail: string[];
  pulse: "in" | "out" | null;
  onExit: () => void;
}) {
  const add = useCart((s) => s.add);
  const [index, setIndex] = useState(0);
  const [variant, setVariant] = useState(0);

  const current = products[Math.min(index, products.length - 1)];
  const variants = useMemo(() => current?.variants ?? [], [current]);
  const chosen = variants[Math.min(variant, variants.length - 1)];

  if (products.length === 0) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-scene px-6">
        <p className="text-sm text-scene-dim">No hay productos disponibles en este estante.</p>
        <button onClick={onExit} className="press tap-44 rounded-xl bg-panel px-5 py-3 text-sm text-scene-fg">
          Volver
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative flex h-[100dvh] flex-col justify-end overflow-hidden bg-scene pb-24 ${pulse === "in" ? "pulse-in" : pulse === "out" ? "pulse-out" : ""}`}
    >
      <p className="px-4 pb-2 text-[12px] text-scene-dim">{trail.join(" › ")}</p>

      <ProductCarousel
        products={products}
        onActiveChange={(i) => {
          setIndex(i);
          setVariant(0);
        }}
      />

      <div className="px-4">
        <p key={current?.id} className="crossfade mb-2 text-base font-medium text-scene-fg">
          {current?.name}
        </p>
        <div className="overflow-hidden rounded-xl bg-panel">
          {variants.map((v, i) => (
            <button
              key={v.label}
              onClick={() => setVariant(i)}
              className={`tap-44 flex w-full items-center justify-between px-4 py-3 text-sm ${i === variant ? "text-scene-fg" : "text-scene-dim"}`}
            >
              <span>{v.label}</span>
              <span className="tabular-nums">{formatPrice(v.price)}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => current && chosen && add(current.id, chosen.label, chosen.price)}
          className="press tap-44 mt-3 w-full rounded-xl bg-panel py-4 text-sm font-medium text-scene-fg glow-active"
        >
          Agregar al carrito
        </button>
      </div>

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
