import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();
const loadRhEmployeesMock = vi.fn(() => []);
const createClientMock = vi.fn();

vi.mock("@/lib/browser-cache", () => ({
  hasBrowserWindow: () => true,
  purgeLegacyCacheKeys: (keys: string[]) => {
    keys.forEach((key) => storage.delete(key));
  },
}));

vi.mock("@/lib/rh-store", () => ({
  loadRhEmployees: () => loadRhEmployeesMock(),
}));

vi.mock("@/lib/supabase", () => ({
  createClient: () => createClientMock(),
}));

function createWindowMock() {
  return {
    localStorage: {
      getItem(key: string) {
        return storage.has(key) ? storage.get(key)! : null;
      },
      setItem(key: string, value: string) {
        storage.set(key, value);
      },
      removeItem(key: string) {
        storage.delete(key);
      },
      key(index: number) {
        return Array.from(storage.keys())[index] ?? null;
      },
      get length() {
        return storage.size;
      },
    },
    dispatchEvent() {
      return true;
    },
  };
}

function createSupabaseMock({
  plansRows = [],
  entriesRows = [],
  configRows = [],
  mechanicsRows = [],
  insertedPlanId = "plan-new",
  onUpdatePlan,
  onDeleteEntries,
  onInsertEntries,
  onInsertPlan,
  onUpsertConfig,
  onDeleteConfig,
  onUpsertMechanics,
  onDeleteMechanics,
}: {
  plansRows?: Array<Record<string, unknown>>;
  entriesRows?: Array<Record<string, unknown>>;
  configRows?: Array<Record<string, unknown>>;
  mechanicsRows?: Array<Record<string, unknown>>;
  insertedPlanId?: string;
  onUpdatePlan?: (payload: Record<string, unknown>, id: string) => void;
  onDeleteEntries?: (planIds: string[]) => void;
  onInsertEntries?: (rows: Array<Record<string, unknown>>) => void;
  onInsertPlan?: (payload: Record<string, unknown>) => void;
  onUpsertConfig?: (rows: Array<Record<string, unknown>>) => void;
  onDeleteConfig?: (rayons: string[]) => void;
  onUpsertMechanics?: (rows: Array<Record<string, unknown>>) => void;
  onDeleteMechanics?: (names: string[]) => void;
}) {
  return {
    from(table: string) {
      if (table === "plans_tg") {
        return {
          select() {
            return {
              limit: async () => ({ data: plansRows, error: null }),
            };
          },
          update(payload: Record<string, unknown>) {
            return {
              eq: async (_column: string, id: string) => {
                onUpdatePlan?.(payload, id);
                return { error: null };
              },
            };
          },
          insert(payload: Record<string, unknown>) {
            onInsertPlan?.(payload);
            return {
              select() {
                return {
                  single: async () => ({ data: { id: insertedPlanId }, error: null }),
                };
              },
            };
          },
        };
      }

      if (table === "plans_tg_entries") {
        return {
          select() {
            return {
              order() {
                return {
                  limit: async () => ({ data: entriesRows, error: null }),
                };
              },
            };
          },
          delete() {
            return {
              in: async (_column: string, planIds: string[]) => {
                onDeleteEntries?.(planIds);
                return { error: null };
              },
            };
          },
          insert(rows: Array<Record<string, unknown>>) {
            onInsertEntries?.(rows);
            return Promise.resolve({ error: null });
          },
        };
      }

      if (table === "tg_rayons_config") {
        return {
          select() {
            return {
              order() {
                return {
                  limit: async () => ({ data: configRows, error: null }),
                };
              },
              limit: async () => ({ data: configRows, error: null }),
            };
          },
          upsert(rows: Array<Record<string, unknown>>) {
            onUpsertConfig?.(rows);
            return Promise.resolve({ error: null });
          },
          delete() {
            return {
              in: async (_column: string, rayons: string[]) => {
                onDeleteConfig?.(rayons);
                return { error: null };
              },
            };
          },
        };
      }

      if (table === "tg_custom_mechanics") {
        return {
          select() {
            return {
              order() {
                return {
                  limit: async () => ({ data: mechanicsRows, error: null }),
                };
              },
              limit: async () => ({ data: mechanicsRows, error: null }),
            };
          },
          upsert(rows: Array<Record<string, unknown>>) {
            onUpsertMechanics?.(rows);
            return Promise.resolve({ error: null });
          },
          delete() {
            return {
              in: async (_column: string, names: string[]) => {
                onDeleteMechanics?.(names);
                return { error: null };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

describe("tg-store", () => {
  beforeEach(() => {
    storage.clear();
    loadRhEmployeesMock.mockReset();
    loadRhEmployeesMock.mockReturnValue([]);
    createClientMock.mockReset();
    vi.resetModules();
    Object.defineProperty(globalThis, "window", {
      value: createWindowMock(),
      configurable: true,
      writable: true,
    });
  });

  it("purges legacy TG localStorage keys instead of relying on browser cache", async () => {
    storage.set("epicerie-manager-tg-week-plans-v1", JSON.stringify([{ tgProduct: "LEGACY" }]));
    storage.set("epicerie-manager-tg-rayons-v1", JSON.stringify([{ rayon: "LEGACY" }]));
    const store = await import("@/lib/tg-store");
    store.loadTgWeekPlans();
    store.loadTgRayons();
    expect(storage.has("epicerie-manager-tg-week-plans-v1")).toBe(false);
    expect(storage.has("epicerie-manager-tg-rayons-v1")).toBe(false);
  });

  it("saves TG plans to Supabase by recreating entries for the touched weeks", async () => {
    const deletedPlanIds: string[][] = [];
    const insertedEntries: Array<Record<string, unknown>> = [];
    const insertedPlans: Array<Record<string, unknown>> = [];

    createClientMock.mockReturnValue(
      createSupabaseMock({
        plansRows: [
          {
            id: "plan-existing",
            label: "S02 - 02 Janvier 26",
            semaine_de: "S02",
            date_de: "2026-01-05",
            date_a: "2026-01-11",
          },
        ],
        insertedPlanId: "plan-created",
        onDeleteEntries: (planIds) => deletedPlanIds.push(planIds),
        onInsertEntries: (rows) => insertedEntries.push(...rows),
        onInsertPlan: (payload) => insertedPlans.push(payload),
      }),
    );

    const store = await import("@/lib/tg-store");
    const allPlans = store.loadTgWeekPlans();
    const subset = [
      allPlans.find((row) => row.weekId === "02 Janvier 26" && row.rayon === "BIO 1"),
      allPlans.find((row) => row.weekId === "02 Janvier 26" && row.rayon === "BIO 2"),
      allPlans.find((row) => row.weekId === "03 Janvier 26" && row.rayon === "BIO 1"),
      allPlans.find((row) => row.weekId === "03 Janvier 26" && row.rayon === "BIO 2"),
    ]
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map((row, index) => ({
        ...row,
        gbProduct: `GB ${index + 1}`,
        tgProduct: `TG ${index + 1}`,
        tgQuantity: `${index + 1} BOX`,
        tgMechanic: "2EME 50%",
        hasOperation: true,
      }));

    const saved = await store.saveTgWeekPlansToSupabase(subset);

    expect(saved).toBe(true);
    expect(deletedPlanIds.flat()).toEqual(expect.arrayContaining(["plan-existing", "plan-created"]));
    expect(insertedPlans).toHaveLength(1);
    expect(insertedEntries).toHaveLength(subset.length);
    expect(insertedEntries[0]?.tg_produit).toBe("TG 1");
  });

  it("saves TG rayon configuration and custom mechanics to Supabase", async () => {
    const upsertedConfig: Array<Record<string, unknown>> = [];
    const upsertedMechanics: Array<Record<string, unknown>> = [];
    const deletedConfig: string[][] = [];
    const deletedMechanics: string[][] = [];

    createClientMock.mockReturnValue(
      createSupabaseMock({
        configRows: [{ rayon: "STALE RAYON" }],
        mechanicsRows: [{ name: "STALE MECA" }],
        onUpsertConfig: (rows) => upsertedConfig.push(...rows),
        onDeleteConfig: (rayons) => deletedConfig.push(rayons),
        onUpsertMechanics: (rows) => upsertedMechanics.push(...rows),
        onDeleteMechanics: (names) => deletedMechanics.push(names),
      }),
    );

    const store = await import("@/lib/tg-store");
    const saved = await store.saveTgConfigToSupabase(
      [
        {
          rayon: "TEST RAYON",
          family: "Sucre",
          order: "30",
          active: true,
          startWeekId: "17 Avril 26",
        },
      ],
      [{ rayon: "TEST RAYON", employee: "CECILE" }],
      ["OFFRE TEST"],
    );

    expect(saved).toBe(true);
    expect(upsertedConfig).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rayon: "TEST RAYON",
          family: "SUCRE",
          order_index: 30,
          default_responsible: "CECILE",
        }),
      ]),
    );
    expect(upsertedMechanics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "OFFRE TEST",
          order_index: 10,
        }),
      ]),
    );
    expect(deletedConfig.flat()).toContain("STALE RAYON");
    expect(deletedMechanics.flat()).toContain("STALE MECA");
  });

  it("rebuilds rayons, assignments and mechanics from Supabase sync", async () => {
    createClientMock.mockReturnValue(
      createSupabaseMock({
        configRows: [
          {
            rayon: "BIO 1",
            family: "SALE",
            order_index: 10,
            active: true,
            start_week_id: null,
            default_responsible: "KAMEL",
          },
        ],
        mechanicsRows: [{ name: "OFFRE TEST", order_index: 10 }],
        plansRows: [
          {
            id: "plan-1",
            label: "S03 - 03 Janvier 26",
            semaine_de: "S03",
          },
        ],
        entriesRows: [
          {
            id: 10,
            plan_id: "plan-1",
            rayon: "NOUVEAU RAYON",
            famille: "SUCRE",
            gb_produits: "GB TEST",
            tg_responsable: "CECILE",
            tg_produit: "TG TEST",
            tg_quantite: "2 BOX",
            tg_mecanique: "OFFRE TEST",
          },
        ],
      }),
    );

    const store = await import("@/lib/tg-store");
    const synced = await store.syncTgFromSupabase();

    expect(synced).toBe(true);
    expect(store.loadTgRayons()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rayon: "NOUVEAU RAYON",
          family: "Sucre",
          startWeekId: "03 Janvier 26",
        }),
      ]),
    );
    expect(store.loadTgDefaultAssignments()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rayon: "NOUVEAU RAYON", employee: "CECILE" }),
      ]),
    );
    expect(store.loadTgCustomMechanics()).toContain("OFFRE TEST");
    expect(store.loadTgWeekPlans()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rayon: "NOUVEAU RAYON",
          tgProduct: "TG TEST",
          gbProduct: "GB TEST",
        }),
      ]),
    );
  });

  it("keeps the canonical rayon order when syncing partial Supabase data", async () => {
    createClientMock.mockReturnValue(
      createSupabaseMock({
        configRows: [
          {
            rayon: "BIO 1",
            family: "SALE",
            order_index: 10,
            active: true,
            start_week_id: null,
            default_responsible: "KAMEL",
          },
          {
            rayon: "BIO 2",
            family: "SALE",
            order_index: 20,
            active: true,
            start_week_id: null,
            default_responsible: "KAMEL",
          },
          {
            rayon: "CHIPS",
            family: "SALE",
            order_index: 30,
            active: true,
            start_week_id: null,
            default_responsible: "MOHAMED",
          },
          {
            rayon: "PATISSERIE",
            family: "SUCRE",
            order_index: 120,
            active: true,
            start_week_id: null,
            default_responsible: "EL HASSANE",
          },
        ],
        plansRows: [
          {
            id: "plan-17",
            label: "S17 - 17 Avril 26",
            semaine_de: "S17",
          },
        ],
        entriesRows: [
          {
            id: 501,
            plan_id: "plan-17",
            rayon: "PATISSERIE",
            famille: "SUCRE",
            gb_produits: null,
            tg_responsable: "EL HASSANE",
            tg_produit: "TEST PATISSERIE",
            tg_quantite: "1 BOX",
            tg_mecanique: "2EME 50%",
          },
          {
            id: 502,
            plan_id: "plan-17",
            rayon: "CHIPS",
            famille: "SALE",
            gb_produits: null,
            tg_responsable: "MOHAMED",
            tg_produit: "TEST CHIPS",
            tg_quantite: "2 BOX",
            tg_mecanique: "2EME 60%",
          },
        ],
      }),
    );

    const store = await import("@/lib/tg-store");
    const synced = await store.syncTgFromSupabase();
    const rayons = store.loadTgRayons();

    expect(synced).toBe(true);
    expect(rayons[0]?.rayon).toBe("BIO 1");
    expect(rayons[1]?.rayon).toBe("BIO 2");
    expect(rayons[2]?.rayon).toBe("CHIPS");
    expect(rayons.find((row) => row.rayon === "PATISSERIE")?.order).toBe("120");
  });
});
