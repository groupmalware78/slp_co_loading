import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Forgot your password?</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>
        <ForgotPasswordForm />
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-slate-900 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
