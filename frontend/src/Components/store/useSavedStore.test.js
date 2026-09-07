import { useSavedStore } from './useSavedStore';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';
jest.mock('../lib/axios', () => ({ axiosInstance: { get: jest.fn(), put: jest.fn(), delete: jest.fn() } }));
jest.mock('react-hot-toast', () => ({ error: jest.fn() }));
const entry = { listingType: 'item', listingId: 'desk', listing: { title: 'Desk' } };
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
beforeEach(() => {
  useSavedStore.getState().setUser(null);
  jest.clearAllMocks();
  axiosInstance.get.mockResolvedValue({ data: [] });
  axiosInstance.put.mockResolvedValue({ data: entry });
  axiosInstance.delete.mockResolvedValue({});
});
test('saves, prevents concurrent duplicates, unsaves, and reloads account records', async () => {
  useSavedStore.getState().setUser('a');
  await tick();
  await Promise.all([useSavedStore.getState().toggle('item', 'desk'), useSavedStore.getState().toggle('item', 'desk')]);
  expect(axiosInstance.put).toHaveBeenCalledTimes(1);
  expect(useSavedStore.getState().entries).toEqual([entry]);
  useSavedStore.getState().setUser(null);
  expect(useSavedStore.getState().entries).toEqual([]);
  axiosInstance.get.mockResolvedValue({ data: [entry] });
  useSavedStore.getState().setUser('a');
  await tick();
  expect(useSavedStore.getState().entries).toEqual([entry]);
  await useSavedStore.getState().toggle('item', 'desk');
  expect(axiosInstance.delete).toHaveBeenCalledWith('/saved/item/desk', { timeout: 15000 });
  expect(useSavedStore.getState().entries).toEqual([]);
});
test('late responses cannot leak saved listings into another account', async () => {
  let finish;
  axiosInstance.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  useSavedStore.getState().setUser('a');
  useSavedStore.getState().setUser('b');
  await tick();
  finish({ data: [entry] });
  await tick();
  expect(useSavedStore.getState().userId).toBe('b');
  expect(useSavedStore.getState().entries).toEqual([]);
});
test('failed saves and removals preserve confirmed state and can be retried', async () => {
  useSavedStore.getState().setUser('a');
  await tick();
  axiosInstance.put.mockRejectedValueOnce(new Error('offline'));
  await useSavedStore.getState().toggle('item', 'desk');
  expect(useSavedStore.getState().entries).toEqual([]);
  expect(useSavedStore.getState().pending['item:desk']).toBe(false);
  await useSavedStore.getState().toggle('item', 'desk');
  axiosInstance.delete.mockRejectedValueOnce(new Error('offline'));
  await useSavedStore.getState().toggle('item', 'desk');
  expect(useSavedStore.getState().entries).toEqual([entry]);
  expect(toast.error).toHaveBeenCalledTimes(2);
});
test('a save response arriving after logout is discarded', async () => {
  useSavedStore.getState().setUser('a');
  await tick();
  let finish;
  axiosInstance.put.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const saving = useSavedStore.getState().toggle('item', 'desk');
  useSavedStore.getState().setUser(null);
  finish({ data: entry });
  await saving;
  expect(useSavedStore.getState().entries).toEqual([]);
});

test('one click after a load failure fetches state and completes the save', async () => {
  axiosInstance.get.mockRejectedValueOnce(new Error('offline'));
  await useSavedStore.getState().setUser('a');
  expect(useSavedStore.getState().loaded).toBe(false);
  await useSavedStore.getState().toggle('item', 'desk', entry.listing);
  expect(axiosInstance.put).toHaveBeenCalledTimes(1);
  expect(useSavedStore.getState().entries).toEqual([entry]);
});

test('a click during initial loading waits and unsaves an already saved listing', async () => {
  let finish;
  axiosInstance.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  useSavedStore.getState().setUser('a');
  const toggling = useSavedStore.getState().toggle('item', 'desk');
  finish({ data: [entry] });
  await toggling;
  expect(axiosInstance.get).toHaveBeenCalledTimes(1);
  expect(axiosInstance.put).not.toHaveBeenCalled();
  expect(axiosInstance.delete).toHaveBeenCalledTimes(1);
  expect(useSavedStore.getState().entries).toEqual([]);
});

test.each(['item', 'accommodation'])('%s updates immediately and rolls back failed requests', async type => {
  await useSavedStore.getState().setUser('a');
  let reject;
  axiosInstance.put.mockImplementationOnce(() => new Promise((resolve, fail) => { reject = fail; }));
  const operation = useSavedStore.getState().toggle(type, 'listing', { title: 'Listing' });
  expect(useSavedStore.getState().entries[0].listingType).toBe(type);
  expect(useSavedStore.getState().pending[`${type}:listing`]).toBe(true);
  reject(new Error('offline'));
  await operation;
  expect(useSavedStore.getState().entries).toEqual([]);
  expect(useSavedStore.getState().pending[`${type}:listing`]).toBe(false);
});

test('background reads cannot undo a newer save', async () => {
  await useSavedStore.getState().setUser('a');
  let finish;
  axiosInstance.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const loading = useSavedStore.getState().load();
  await useSavedStore.getState().toggle('item', 'desk', entry.listing);
  finish({ data: [] });
  await loading;
  expect(useSavedStore.getState().entries).toEqual([entry]);
});
