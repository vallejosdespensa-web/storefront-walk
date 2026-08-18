import { create } from "zustand";
import { seedTenant } from "@/lib/seed";
import type { Tenant } from "@/types";

interface TenantState {
  tenant: Tenant | null;
  loading: boolean;
  hydrate: () => void;
}

export const useTenant = create<TenantState>((set) => ({
  tenant: null,
  loading: true,
  hydrate: () => {
    // TODO: en modo remoto, fetch a /api/tenant
    set({ tenant: seedTenant, loading: false });
  },
}));
