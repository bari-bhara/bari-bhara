/** Simple label/value list for read-only details. */
export function DetailList({
  items,
}: {
  items: { label: string; value: React.ReactNode }[];
}) {
  return (
    <dl className="divide-y">
      {items.map((item) => (
        <div key={item.label} className="grid gap-1 py-3 sm:grid-cols-3 sm:gap-4">
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd className="text-sm font-medium sm:col-span-2">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
