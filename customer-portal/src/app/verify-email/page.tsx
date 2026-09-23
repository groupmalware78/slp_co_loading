import Link from "next/link";
import { isApiError } from "@/lib/apiErrors";
import { apiClient } from "@/lib/apiClient";
import { getPortalSettings } from "@/lib/settings";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const settings = await getPortalSettings();

  let heading = "Invalid verification link";
  let message = "This link is missing its token. Check the link from your email and try again.";
  let success = false;

  if (token) {
    try {
      await apiClient.portalUsers.consumeEmailVerification(token);
      heading = "Email verified";
      message = "Your email address has been confirmed.";
      success = true;
    } catch (err) {
      heading = "Invalid or expired link";
      message = isApiError(err)
        ? err.message
        : "This link doesn't match any pending verification — it may have already been used or expired.";
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mb-3 text-2xl">{success ? "📦" : "⚠️"}</div>
        <h1 className="text-lg font-semibold text-slate-900">{heading}</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Go to sign in
        </Link>
        <p className="mt-4 text-xs text-slate-400">{settings.companyName}</p>
      </div>
    </div>
  );
}
