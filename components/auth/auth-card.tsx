import Link from "next/link";
import type { ReactNode } from "react";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="bob mb-2 text-6xl" aria-hidden>
            🧞
          </div>
          <h1 className="hand text-4xl">{title}</h1>
          <p className="mt-1 text-muted">{subtitle}</p>
        </div>
        <div className="sketch p-6">{children}</div>
        <p className="mt-5 text-center text-sm text-muted">{footer}</p>
        <p className="mt-2 text-center text-sm">
          <Link href="/" className="text-muted underline-offset-4 hover:underline">
            ← Back home
          </Link>
        </p>
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border-2 border-heart bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}

export function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
