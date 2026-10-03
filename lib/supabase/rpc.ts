/**
 * Passes SQL NULL for an RPC argument. Postgres functions accept NULL for any
 * argument, but `supabase gen types` marks every argument non-nullable.
 */
export function sqlNull<T>(value: T | null | undefined): T {
  return (value ?? null) as T;
}
