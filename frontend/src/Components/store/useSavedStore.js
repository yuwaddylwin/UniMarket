import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

export const savedKey = (type, id) => `${type}:${id}`;
let session = 0;
let loadRequest = null;
let revision = 0;
const requestOptions = { timeout: 15000 };
const errorMessage = (error, fallback) => (
  typeof error.response?.data?.message === "string" ? error.response.data.message : fallback
);
const matches = (entry, key) => savedKey(entry.listingType, entry.listingId) === key;

export const useSavedStore = create((set, get) => ({
  userId: null, entries: [], pending: {}, loading: false, loaded: false, error: "",
  setUser: (userId) => {
    if (get().userId === userId) return;
    session += 1;
    loadRequest = null;
    set({ userId, entries: [], pending: {}, loading: false, loaded: false, error: "" });
    if (userId) return get().load();
  },
  load: () => {
    if (!get().userId) return Promise.resolve(false);
    if (loadRequest) return loadRequest;
    const current = session;
    const startingRevision = revision;
    set({ loading: true, error: "" });
    loadRequest = (async () => {
      try {
        const { data } = await axiosInstance.get("/saved", requestOptions);
        if (!Array.isArray(data)) throw new Error("Invalid saved listings response");
        if (current !== session) return false;
        // A background read must not replace newer save/unsave state.
        if (startingRevision === revision && !Object.values(get().pending).some(Boolean)) {
          set({ entries: [...new Map(data.map(entry => [savedKey(entry.listingType, entry.listingId), entry])).values()] });
        } else if (!get().loaded) {
          set({ entries: data });
        }
        set({ loaded: true });
        return true;
      } catch (error) {
        if (current === session) set({ error: errorMessage(error, "Unable to load saved listings. Please try again.") });
        return false;
      } finally {
        if (current === session) {
          loadRequest = null;
          set({ loading: false });
        }
      }
    })();
    return loadRequest;
  },
  toggle: async (type, id, listing = null) => {
    const key = savedKey(type, id);
    if (!get().userId || !id || get().pending[key]) return;
    const current = session;
    set(state => ({ pending: { ...state.pending, [key]: true } }));
    let previousEntry;
    let previousIndex;
    let changed = false;
    try {
      // Recover the known state and complete the original click in one action.
      if (!get().loaded && !await get().load()) {
        if (current === session) toast.error(get().error);
        return;
      }
      if (current !== session) return;
      previousIndex = get().entries.findIndex(entry => matches(entry, key));
      previousEntry = get().entries[previousIndex];
      revision += 1;
      changed = true;
      set(state => ({
        error: "",
        entries: previousEntry
          ? state.entries.filter(entry => !matches(entry, key))
          : [{ listingType: type, listingId: id, listing }, ...state.entries],
      }));
      if (previousEntry) {
        await axiosInstance.delete(`/saved/${type}/${id}`, requestOptions);
      } else {
        const { data } = await axiosInstance.put(`/saved/${type}/${id}`, {}, requestOptions);
        if (!data || data.listingType !== type || String(data.listingId) !== String(id)) throw new Error("Invalid saved listing response");
        if (current === session) set(state => ({ entries: state.entries.map(entry => matches(entry, key) ? data : entry) }));
      }
    } catch (error) {
      if (current === session) {
        if (changed) {
          revision += 1;
          set(state => {
            const entries = state.entries.filter(entry => !matches(entry, key));
            if (previousEntry) entries.splice(Math.min(previousIndex, entries.length), 0, previousEntry);
            return { entries };
          });
        }
        toast.error(errorMessage(error, "Unable to update saved listings. Please try again."));
      }
    } finally {
      if (current === session) set(state => ({ pending: { ...state.pending, [key]: false } }));
    }
  },
}));
