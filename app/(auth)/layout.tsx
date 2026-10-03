import { Logo } from "@/components/app/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center bg-muted/40 px-4 py-10 sm:justify-center">
      <Logo className="mb-8 text-lg" />
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
