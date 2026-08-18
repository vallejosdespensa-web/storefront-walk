import { useMemo, useState } from "react";
import { Menu, Search, ShoppingCart, X } from "lucide-react";
import { useTenant } from "@/store/useTenant";
import { useNavigation } from "@/store/useNavigation";
import { useCart } from "@/store/useCart";

export function Chrome({ onOpenSearch }: { onOpenSearch: () => void }) {
  const tenant = useTenant((s) => s.tenant);
  const reset = useNavigation((s) => s.reset);
  const goToLevel = useNavigation((s) => s.goToLevel);
  const items = useCart((s) => s.items);
  const setCartOpen = useCart((s) => s.setOpen);
  const [menuOpen, setMenuOpen] = useState(false);

  const count = items.length;
  const menuItems = useMemo(
    () => [
      { label: "Inicio", action: () => reset() },
      { label: "Categorías", action: () => goToLevel("salon") },
      { label: "Mi carrito", action: () => setCartOpen(true) },
      { label: "Contacto", action: () => goToLevel("salon") },
    ],
    [goToLevel, reset, setCartOpen],
  );

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between p-3">
        <button
          onClick={() => reset()}
          className="press tap-44 pointer-events-auto rounded-full bg-panel/70 px-4 py-2 text-sm font-medium text-scene-fg backdrop-blur"
        >
          {tenant?.name ?? ""}
        </button>
        <button
          onClick={onOpenSearch}
          aria-label="Buscar"
          className="press tap-44 pointer-events-auto grid place-items-center rounded-full bg-panel/70 p-3 text-scene-fg backdrop-blur"
        >
          <Search size={18} />
        </button>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Menú"
          className="press tap-44 pointer-events-auto grid place-items-center rounded-full bg-panel/70 p-3 text-scene-fg backdrop-blur"
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {menuOpen && (
        <nav className="crossfade fixed right-3 top-16 z-40 w-48 overflow-hidden rounded-xl bg-panel/95 backdrop-blur">
          {menuItems.map((m) => (
            <button
              key={m.label}
              onClick={() => {
                m.action();
                setMenuOpen(false);
              }}
              className="press tap-44 block w-full px-4 py-3 text-left text-sm text-scene-fg"
            >
              {m.label}
            </button>
          ))}
        </nav>
      )}

      {count > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          aria-label="Ver carrito"
          className="press tap-44 fixed bottom-5 right-4 z-40 flex items-center gap-2 rounded-full bg-panel px-5 py-4 text-scene-fg shadow-lg"
          style={{ animation: "scene-fade 200ms ease-out" }}
        >
          <ShoppingCart size={18} />
          <span className="text-sm tabular-nums">{count}</span>
        </button>
      )}
    </>
  );
}
