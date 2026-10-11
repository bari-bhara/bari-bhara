import { Logo } from "@/components/app/logo";
import { OrbitBackdrop } from "@/components/app/orbit-backdrop";

/** Sign-in pages: the form on the canvas, with the moss orbit panel beside it on wide screens. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh bg-canvas lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <main className="flex flex-col items-center px-4 py-10 sm:justify-center">
        <Logo className="mb-10 lg:hidden" />
        <div className="w-full max-w-md">{children}</div>
      </main>
      <aside
        className="dark relative isolate m-3 hidden overflow-hidden rounded-[2rem] border bg-background p-10 text-foreground lg:flex lg:flex-col lg:justify-between"
        aria-label="About Bari_bhara"
      >
        <OrbitBackdrop className="-bottom-72 -right-72 -z-10 w-[52rem]" />
        <Logo />
        <div>
          <p className="max-w-md font-display text-4xl font-light leading-tight">
            Rent, bills and repairs, in one calm place.
          </p>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            Landlords track every flat and payment. Tenants see what they owe and report what needs fixing.
          </p>
        </div>
      </aside>
    </div>
  );
}
