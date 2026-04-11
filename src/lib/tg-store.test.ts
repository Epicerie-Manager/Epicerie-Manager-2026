import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();
const loadRhEmployeesMock = vi.fn(() => []);
const createClientMock = vi.fn();

vi.mock("@/lib/browser-cache", () => ({
  hasBrowserWindow: () => true,
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
  insertedPlanId = "plan-new",
  onUpdatePlan,
  onDeleteEntries,
  onInsertEntries,
  onInsertPlan,
}: {
  plansRows?: Array<Record<string, unknown>>;
  entriesRows?: Array<Record<string, unknown>>;
  insertedPlanId?: string;
  onUpdatePlan?: (payload: Record<string, unknown>, id: string) => void;
  onDeleteEntries?: (planIds: string[]) => void;
  onInsertEntries?: (rows: Array<Record<string, unknown>>) => void;
  onInsertPlan?: (payload: Record<string, unknown>) => void;
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

  it("persists week plans in localStorage across module reloads", async () => {
    const store = await import("@/lib/tg-store");
    const plans = store.loadTgWeekPlans();
    const updatedPlans = plans.map((row, index) =>
      index === 0 ? { ...row, tgProduct: "TEST PERSISTENCE", hasOperation: true } : row,
    );

    store.saveTgWeekPlans(updatedPlans);
    expect(storage.get("epicerie-manager-tg-week-plans-v1")).toContain("TEST PERSISTENCE");

    vi.resetModules();
    Object.defineProperty(globalThis, "window", {
      value: createWindowMock(),
      configurable: true,
      writable: true,
    });

    const reloadedStore = await import("@/lib/tg-store");
    expect(reloadedStore.loadTgWeekPlans()[0]?.tgProduct).toBe("TEST PERSISTENCE");
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

  it("rebuilds rayons, assignments and mechanics from Supabase sync", async () => {
    createClientMock.mockReturnValue(
      createSupabaseMock({
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
});
