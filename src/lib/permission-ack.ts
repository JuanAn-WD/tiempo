import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { PERMISSION_IDS, type PermissionId } from '@/lib/permission-flow';

const STORAGE_KEY = 'apartag.permissions.ack.v1';

export type PermissionRecord = {
  seen: PermissionId[];
  attempted: PermissionId[];
};

const EMPTY: PermissionRecord = { seen: [], attempted: [] };

function isPermissionId(value: unknown): value is PermissionId {
  return typeof value === 'string' && (PERMISSION_IDS as readonly string[]).includes(value);
}

function sanitize(value: unknown): PermissionRecord {
  if (!value || typeof value !== 'object') return EMPTY;
  const record = value as { seen?: unknown; attempted?: unknown };
  const seen = Array.isArray(record.seen) ? record.seen.filter(isPermissionId) : [];
  const attempted = Array.isArray(record.attempted) ? record.attempted.filter(isPermissionId) : [];
  return { seen, attempted };
}

let queue: Promise<void> = Promise.resolve();

async function readRecord(): Promise<PermissionRecord> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    return sanitize(JSON.parse(raw) as unknown);
  } catch {
    return EMPTY;
  }
}

function update(mutator: (prev: PermissionRecord) => PermissionRecord): Promise<PermissionRecord> {
  const run = queue.then(async () => {
    const prev = await readRecord();
    const next = mutator(prev);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      return prev;
    }
    return next;
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function loadPermissionRecord(): Promise<PermissionRecord> {
  return readRecord();
}

export function markPermissionSeen(id: PermissionId): Promise<PermissionRecord> {
  return update((prev) => (prev.seen.includes(id) ? prev : { ...prev, seen: [...prev.seen, id] }));
}

export function markPermissionAttempted(id: PermissionId): Promise<PermissionRecord> {
  return update((prev) =>
    prev.attempted.includes(id) ? prev : { ...prev, attempted: [...prev.attempted, id] },
  );
}

export function usePermissionRecord() {
  const [record, setRecord] = useState<PermissionRecord>(EMPTY);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    setRecord(await loadPermissionRecord());
    setReady(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const markSeen = useCallback(async (id: PermissionId) => {
    setRecord(await markPermissionSeen(id));
  }, []);

  const markAttempted = useCallback(async (id: PermissionId) => {
    setRecord(await markPermissionAttempted(id));
  }, []);

  return { record, ready, reload, markSeen, markAttempted };
}
