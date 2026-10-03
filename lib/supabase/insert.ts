import type { Database, TablesInsert } from "./database.types";

type TableName = keyof Database["public"]["Tables"];

/**
 * An insert row for a table whose listed NOT NULL columns are filled by a
 * BEFORE INSERT trigger (and usually aren't insertable by users at all).
 * Generated types can't know that, so this records it in one place.
 */
export function filledByTrigger<T extends TableName, K extends keyof TablesInsert<T>>(
  row: Omit<TablesInsert<T>, K>,
  // Names the trigger-filled columns at the call site; not used at runtime.
  columns: readonly K[],
): TablesInsert<T> {
  void columns;
  return row as TablesInsert<T>;
}
