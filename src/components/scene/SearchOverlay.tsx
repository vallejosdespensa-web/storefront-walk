import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useTenant } from "@/store/useTenant";
import { formatPrice } from "@/lib/tree";
import { ProductCarousel } from "./ProductCarousel";

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const tenant = useTenant((s) => s.tenant);
  const [query, setQuery] = useState("");
  const [brandId, setBrandId] = useState<string | null>(null);

  const products = useMemo(() => tenant?.products ?? [], [tenant]);
  const brands = useMemo(() => tenant?.brands ?? [], [tenant]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

  const brandProducts = useMemo(
    () => (brandId ? products.filter((p) => p.brandId === brandId && p.inStock) : []),
    [brandId, products],
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-scene/85 backdrop-blur-md">
      <div className="flex items-center gap-2 p-4 pt-5">
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setBrandId(null);
          }}
          placeholder="Buscar por nombre"
          className="tap-44 flex-1 rounded-xl bg-panel px-4 py-3 text-sm text-scene-fg outline-none placeholder:text-scene-dim"
        />
        <button
          onClick={onClose}
          aria-label="Cerrar búsqueda"
          className="press tap-44 grid place-items-center rounded-full bg-panel p-3 text-scene-fg"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {query.trim() ? (
          results.length > 0 ? (
            <ul className="space-y-2">
              {results.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl bg-panel p-3"
                  style={{ opacity: p.inStock ? 1 : 0.55 }}
                >
                  <span
                    className="h-10 w-10 shrink-0 rounded-md"
                    style={{ backgroundColor: p.color }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-scene-fg">{p.name}</span>
                    <span className="block text-[11px] text-scene-dim">
                      {p.inStock ? formatPrice(p.variants[0]?.price ?? 0) : "sin stock"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pt-6 text-center text-sm text-scene-dim">
              Sin resultados. Probá con la grilla de marcas.
            </p>
          )
        ) : brandId ? (
          <>
            <button
              onClick={() => setBrandId(null)}
              className="press tap-44 mb-2 text-xs text-scene-dim"
            >
              ‹ Todas las marcas
            </button>
            <ProductCarousel products={brandProducts} />
          </>
        ) : (
          <div className="eye-mask grid grid-cols-3 gap-2">
            {brands.map((b) => (
              <button
                key={b.id}
                onClick={() => setBrandId(b.id)}
                className="press tap-44 grid h-20 place-items-center rounded-xl bg-panel px-2 text-center text-xs text-scene-fg"
              >
                {b.logoUrl ? (
                  <img src={b.logoUrl} alt={b.name} className="max-h-10 object-contain" />
                ) : (
                  b.name
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
