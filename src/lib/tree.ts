import type { CategoryNode, Product, Tenant } from "@/types";

export function findByPath(roots: CategoryNode[], path: string[]): CategoryNode | null {
  let list = roots;
  let node: CategoryNode | null = null;
  for (const id of path) {
    const found = list.find((n) => n.id === id);
    if (!found) return null;
    node = found;
    list = found.children ?? [];
  }
  return node;
}

export function trailNames(roots: CategoryNode[], path: string[]): string[] {
  const names: string[] = [];
  let list = roots;
  for (const id of path) {
    const found = list.find((n) => n.id === id);
    if (!found) break;
    names.push(found.name);
    list = found.children ?? [];
  }
  return names;
}

export function allNodes(roots: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = [];
  const walk = (list: CategoryNode[]) => {
    for (const n of list) {
      out.push(n);
      if (n.children) walk(n.children);
    }
  };
  walk(roots);
  return out;
}

export function descendantIds(node: CategoryNode): string[] {
  const out = [node.id];
  for (const c of node.children ?? []) out.push(...descendantIds(c));
  return out;
}

export function productsFor(tenant: Tenant, node: CategoryNode | null, brandId: string | null) {
  const ids = node ? descendantIds(node) : null;
  return tenant.products.filter(
    (p) =>
      p.inStock &&
      (!ids || ids.includes(p.categoryId)) &&
      (!brandId || p.brandId === brandId),
  );
}

export function byId<T extends { id: string }>(list: T[], id: string): T | undefined {
  return list.find((i) => i.id === id);
}

export function pickProducts(products: Product[], ids: string[] | undefined): Product[] {
  if (!ids) return [];
  return ids.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p);
}

export function formatPrice(value: number) {
  return `$${value.toLocaleString("es-AR")}`;
}
