import { create } from "zustand";

export type Level = "facade" | "entering" | "salon" | "aisle" | "brands" | "product";

interface NavigationState {
  level: Level;
  /** ids de categoría desde la raíz hasta el nodo actual */
  path: string[];
  activeIndex: number;
  salonIndex: number;
  brandId: string | null;
  enter: (nodeId: string) => void;
  goBack: () => void;
  setActiveIndex: (i: number) => void;
  setSalonIndex: (i: number) => void;
  goToLevel: (l: Level) => void;
  setBrandId: (id: string | null) => void;
  reset: () => void;
}

export const useNavigation = create<NavigationState>((set, get) => ({
  level: "facade",
  path: [],
  activeIndex: 0,
  salonIndex: 0,
  brandId: null,
  enter: (nodeId) => {
    const { path } = get();
    set({ path: [...path, nodeId], level: "aisle", activeIndex: 0 });
  },
  goBack: () => {
    const { level, path } = get();
    if (level === "product") {
      set({ level: "brands" });
      return;
    }
    if (level === "brands") {
      set({ level: "aisle", brandId: null, path: path.slice(0, -1), activeIndex: 0 });
      return;
    }
    if (level === "aisle") {
      if (path.length > 1) {
        set({ path: path.slice(0, -1), activeIndex: 0 });
      } else {
        set({ path: [], level: "salon", activeIndex: 0 });
      }
      return;
    }
    if (level === "salon") {
      set({ level: "facade" });
    }
  },
  setActiveIndex: (i) => set({ activeIndex: i }),
  setSalonIndex: (i) => set({ salonIndex: i }),
  goToLevel: (l) => set({ level: l }),
  setBrandId: (id) => set({ brandId: id, level: id ? "product" : "brands" }),
  reset: () => set({ level: "facade", path: [], activeIndex: 0, brandId: null }),
}));
