import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Log in · Game Gen" };

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back!"
      subtitle="Log in to make and play your games."
      footer={
        <>
          No account yet?{" "}
          <Link href="/signup" className="font-semibold text-brand">
            Sign up free
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
