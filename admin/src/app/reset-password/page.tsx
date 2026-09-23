import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { token } = await searchParams;
  if (!token) redirect("/forgot-password");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Reset your password</h1>
          <p className="mt-1 text-sm text-slate-500">Choose a new password below.</p>
        </div>
        <ResetPasswordForm token={token} />
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-slate-900 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
