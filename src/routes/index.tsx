import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CategoryNode } from "@/types";
import { useTenant } from "@/store/useTenant";
import { useNavigation } from "@/store/useNavigation";
import { useMounted } from "@/lib/useClient";
import { findByPath, trailNames } from "@/lib/tree";
import { Chrome } from "@/components/scene/Chrome";
import { Facade } from "@/components/scene/Facade";
import { Salon } from "@/components/scene/Salon";
import { Aisle } from "@/components/scene/Aisle";
import { Brands } from "@/components/scene/Brands";
import { ProductLevel } from "@/components/scene/ProductLevel";
import { CartDrop, CartView } from "@/components/scene/CartOverlay";
import { SearchOverlay } from "@/components/scene/SearchOverlay";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Despensa Vallejos — Comprá caminando por el comercio" },
      {
        name: "description",
        content:
          "Recorré el almacén de barrio como si estuvieras adentro: góndolas, pasillos y marcas, con compra directa desde el celular.",
      },
      { property: "og:title", content: "Despensa Vallejos — Comprá caminando por el comercio" },
      {
        property: "og:description",
        content:
          "Una tienda online que se recorre como un espacio: góndolas en perspectiva, pasillos y carrito, sin grillas de productos.",
      },
    ],
  }),
  component: Store,
});

function Store() {
  const mounted = useMounted();
  const tenant = useTenant((s) => s.tenant);
  const hydrate = useTenant((s) => s.hydrate);

  const level = useNavigation((s) => s.level);
  const path = useNavigation((s) => s.path);
  const brandId = useNavigation((s) => s.brandId);
  const enter = useNavigation((s) => s.enter);
  const goBack = useNavigation((s) => s.goBack);
  const goToLevel = useNavigation((s) => s.goToLevel);
  const setBrandId = useNavigation((s) => s.setBrandId);

  const [searchOpen, setSearchOpen] = useState(false);
  const [pulse, setPulse] = useState<"in" | "out" | null>(null);
  const pulseTimer = useRef<number | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const firePulse = useCallback((kind: "in" | "out") => {
    setPulse(kind);
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => setPulse(null), 320);
  }, []);

  const roots = useMemo(
    () => (tenant ? [...tenant.categories, ...tenant.stackedCategories] : []),
    [tenant],
  );
  const node = useMemo(() => findByPath(roots, path), [roots, path]);
  const trail = useMemo(() => trailNames(roots, path), [roots, path]);

  const brands = useMemo(() => {
    if (!tenant || !node) return [];
    const ids = node.brandIds ?? [];
    return tenant.brands.filter((b) => ids.includes(b.id));
  }, [tenant, node]);

  const products = useMemo(() => {
    if (!tenant || !node) return [];
    return tenant.products.filter(
      (p) => p.inStock && p.categoryId === node.id && (!brandId || p.brandId === brandId),
    );
  }, [tenant, node, brandId]);

  const enterNode = useCallback(
    (child: CategoryNode) => {
      firePulse("in");
      if (child.children && child.children.length > 0) {
        enter(child.id);
      } else {
        enter(child.id);
        goToLevel("brands");
      }
    },
    [enter, firePulse, goToLevel],
  );

  const enterFromSalon = useCallback(
    (id: string) => {
      const found = roots.find((n) => n.id === id);
      if (!found) return;
      enterNode(found);
    },
    [enterNode, roots],
  );

  const exit = useCallback(() => {
    firePulse("out");
    goBack();
  }, [firePulse, goBack]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !searchOpen) exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exit, mounted, searchOpen]);

  // El servidor renderiza SOLO el hero: la escena navegable monta en cliente.
  if (!mounted || level === "facade" || level === "entering") {
    return (
      <main className="bg-scene text-scene-fg">
        {mounted && <Chrome onOpenSearch={() => setSearchOpen(true)} />}
        <Facade />
        {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
        <CartView />
      </main>
    );
  }

  return (
    <main className="bg-scene text-scene-fg">
      <Chrome onOpenSearch={() => setSearchOpen(true)} />

      {level === "salon" && <Salon onEnterNode={enterFromSalon} />}

      {level === "aisle" && node && (
        <Aisle
          key={node.id}
          node={node}
          trail={trail}
          products={tenant?.products ?? []}
          pulse={pulse}
          onEnterChild={enterNode}
          onExit={exit}
        />
      )}

      {level === "brands" && (
        <Brands
          brands={brands}
          trail={trail}
          onSelect={(id) => {
            firePulse("in");
            setBrandId(id);
          }}
          onExit={exit}
        />
      )}

      {level === "product" && (
        <ProductLevel products={products} trail={trail} pulse={pulse} onExit={exit} />
      )}

      <CartDrop />
      <CartView />
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </main>
  );
}
