import { create } from "zustand";
import { persist } from "zustand/middleware";

function makeId() {
  // fallback if not available
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useItemStore = create(
  persist(
    (set, get) => ({
      items: [],

      createItem: (newItem) => {
        const item = {
          _id: makeId(),
          createdAt: new Date().toISOString(),
          ...newItem,
        };

        set({ items: [item, ...get().items] });
        return item;
      },

      removeItem: (itemId) => {
        set({ items: get().items.filter((it) => it._id !== itemId) });
      },

      clearAll: () => set({ items: [] }),
    }),
    {
      name: "sell-items-storage", // localStorage key
    }
  )
);
