import { FilterChips } from "@/components/app/filter-chips";

/** Switches between the rent and utility bill lists (one nav item covers both). */
export function SectionTabs({ current }: { current: "rent" | "bills" }) {
  return (
    <div className="mb-4">
      <FilterChips
        label="Rent and bills"
        chips={[
          { label: "Rent", href: "/rent", active: current === "rent" },
          { label: "Utility bills", href: "/bills", active: current === "bills" },
        ]}
      />
    </div>
  );
}
