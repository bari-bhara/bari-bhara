/** Offset pagination for lists, driven by a `?page=` search param (1-based). */

export const PAGE_SIZE = 20;

export type Paged<T> = { rows: T[]; total: number };

/** The page number from `?page=`; anything invalid is page 1. */
export function parsePage(value: string | undefined): number {
  return Math.max(1, Number.parseInt(value ?? "1", 10) || 1);
}

/** Inclusive row range for Supabase's `.range(from, to)`. */
export function pageRange(page: number, pageSize = PAGE_SIZE): [from: number, to: number] {
  const from = (Math.max(page, 1) - 1) * pageSize;
  return [from, from + pageSize - 1];
}

/** `href` with `page` set (page 1 drops the param). Keeps other params. */
export function withPage(href: string, page: number): string {
  const [path, search = ""] = href.split("?");
  const params = new URLSearchParams(search);
  if (page > 1) params.set("page", String(page));
  else params.delete("page");
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
