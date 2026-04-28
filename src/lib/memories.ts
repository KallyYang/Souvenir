import { kvGet, kvPut } from "./kv";

export interface MemoryEntry {
  date: string;
  imageKey: string;
  imageUrl: string;
  note: string;
  updatedAt: number;
}

export interface MemoriesIndex {
  entries: Record<string, MemoryEntry>;
}

const INDEX_KEY = "memories:index";

export async function loadIndex(): Promise<MemoriesIndex> {
  const data = await kvGet<MemoriesIndex>(INDEX_KEY);
  if (!data || typeof data !== "object" || !data.entries) {
    return { entries: {} };
  }
  return data;
}

export async function saveIndex(index: MemoriesIndex): Promise<void> {
  await kvPut(INDEX_KEY, index);
}

export async function getEntry(date: string): Promise<MemoryEntry | null> {
  const idx = await loadIndex();
  return idx.entries[date] ?? null;
}

export async function upsertEntry(entry: MemoryEntry): Promise<MemoriesIndex> {
  const idx = await loadIndex();
  idx.entries[entry.date] = entry;
  await saveIndex(idx);
  return idx;
}

export async function deleteEntry(date: string): Promise<MemoriesIndex> {
  const idx = await loadIndex();
  delete idx.entries[date];
  await saveIndex(idx);
  return idx;
}

export function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
