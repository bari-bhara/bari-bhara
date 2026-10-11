import { ArrowUpRight, Bell, Building2, Receipt, Wrench } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/app/logo";
import { OrbitBackdrop } from "@/components/app/orbit-backdrop";
import { OrbitGauge } from "@/components/app/orbit-gauge";
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
      {/* The hero always uses the dark tokens, like the app's sidebar (ADR 0008). */}
      <div className="dark relative isolate overflow-hidden bg-background text-foreground sm:m-3 sm:rounded-[2rem] sm:border">
        <OrbitBackdrop className="-right-64 top-1/2 -z-10 w-[56rem] -translate-y-1/2 max-lg:-right-[28rem] max-lg:opacity-60" />

        <header className="flex h-[4.5rem] items-center justify-between px-5 sm:px-10">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <Button asChild variant="ghost">
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </header>

        <main>
          <section className="grid items-center gap-12 px-5 pb-16 pt-12 sm:px-10 sm:pb-24 sm:pt-20 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
                For landlords and their tenants
              </p>
              <h1 className="mt-6 font-display text-[2.6rem] font-light leading-[1.02] sm:text-6xl lg:text-7xl">
                Every flat, every payment, in order.
              </h1>
              <p className="mt-6 max-w-lg text-pretty text-base text-muted-foreground sm:text-lg">
                Bari_bhara helps landlords manage flats, tenants, rent, bills and maintenance, and gives
                tenants one place to see what they owe.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" variant="brand">
                  <Link href="/signup">
                    Get started <ArrowUpRight aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">I already have an account</Link>
                </Button>
              </div>
            </div>

            <div className="hidden justify-center lg:flex">
              <div className="surface w-full max-w-sm p-6">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
                  Your dashboard, for example
                </p>
                <div className="mt-4 flex items-center gap-5">
                  <OrbitGauge value={86} label="Example: 86% of this month's rent collected" className="w-36" />
                  <div className="grid gap-1">
                    <p className="text-sm text-muted-foreground">Collected in October</p>
                    <p className="font-display text-2xl font-light tabular-nums">৳ 3,44,000</p>
                    <p className="text-xs text-muted-foreground">2 tenants to remind</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <section aria-label="Features" className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-10 sm:py-20">
        <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="border-t pt-6">
              <feature.icon className="h-5 w-5 text-muted-foreground" aria-hidden />
              <h2 className="mt-4 font-display text-lg font-normal">{feature.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-auto border-t py-6 text-center text-xs text-muted-foreground">© Bari_bhara</footer>
    </div>
  );
}
