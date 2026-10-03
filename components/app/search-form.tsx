import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * A plain GET search form: submitting updates `?q=` and keeps `params`, so it
 * works without client JavaScript. Changing the search goes back to page 1.
 */
export function SearchForm({
  action,
  label,
  placeholder,
  defaultValue,
  params = {},
}: {
  action: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  /** Other query params to keep, e.g. active filters. */
  params?: Record<string, string>;
}) {
  return (
    <form action={action} role="search" className="relative w-full sm:max-w-sm">
      {Object.entries(params).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        name="q"
        aria-label={label}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="bg-background pl-9"
        enterKeyHint="search"
      />
    </form>
  );
}
