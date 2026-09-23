import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canManagePortal } from "@/lib/rbac";
import { apiClient } from "@/lib/apiClient";
import { ApiKeyRotationForm } from "@/components/ApiKeyRotationForm";

export default async function ApiKeyPage() {
  const session = await auth();
  if (!session?.user || !canManagePortal(session.user.role)) {
    redirect("/login");
  }

  const status = await apiClient.tenant.apiKeyStatus();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">API Key</h1>
        <p className="text-sm text-slate-500">
          The credential this deployment uses to talk to the Service-Provider platform.
        </p>
      </div>
      <ApiKeyRotationForm initial={status} />
    </div>
  );
}
