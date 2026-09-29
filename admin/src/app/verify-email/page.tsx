import Link from "next/link";
import { consumeEmailVerification } from "@/lib/emailVerification";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let heading = "Invalid verification link";
  let message = "This link is missing its token. Check the link from your email and try again.";
  let success = false;

  if (token) {
    const result = await consumeEmailVerification(token);
    if (result.ok) {
      heading = "Email verified";
      message = "Your email address has been confirmed.";
      success = true;
    } else {
      heading = "Invalid or expired link";
      message = result.error ?? "This link doesn't match any pending verification.";
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200/70 bg-white p-6 text-center shadow-md shadow-slate-200/50">
        <div className="mb-3 text-2xl">{success ? "✅" : "⚠️"}</div>
        <h1 className="text-xl font-semibold text-slate-900">{heading}</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-md shadow-violet-600/20 px-4 py-2 text-sm font-medium text-white transition hover:from-violet-500 hover:to-fuchsia-500"
        >
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
