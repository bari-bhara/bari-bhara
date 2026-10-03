import { Bell, Building2, Receipt, Wrench } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/app/logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Building2,
    title: "Properties & flats",
    description: "See which flats are occupied or vacant at a glance.",
  },
  {
    icon: Receipt,
    title: "Rent & bills",
    description: "Track rent and utility bills, payments and what's overdue.",
  },
  {
    icon: Wrench,
    title: "Maintenance",
    description: "Tenants report issues; you track them to resolution.",
  },
  {
    icon: Bell,
    title: "Notices",
    description: "Send announcements to a building or selected flats.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center justify-between border-b px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <Button asChild variant="ghost">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Rent management that just makes sense
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-lg text-muted-foreground">
            Bari_bhara helps landlords manage flats, tenants, rent, bills and
            maintenance — and gives tenants one place to see what they owe.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12">
              <Link href="/signup">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12">
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
        </section>

        <section aria-label="Features" className="mx-auto grid max-w-5xl gap-4 px-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-xl border bg-card p-5">
              <feature.icon className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="mt-3 font-semibold">{feature.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © Bari_bhara
      </footer>
    </div>
  );
}
