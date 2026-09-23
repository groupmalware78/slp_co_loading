"use client";

import { useState } from "react";
import { CreatePreAlertModal } from "./CreatePreAlertModal";

export function CreatePreAlertButton({ emailVerified }: { emailVerified: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={!emailVerified}
        title={emailVerified ? undefined : "Verify your email address (see Account Profile) before submitting a pre-alert"}
        onClick={() => setOpen(true)}
        className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-teal-600"
      >
        Create Pre-Alert
      </button>
      {open && <CreatePreAlertModal onClose={() => setOpen(false)} />}
    </>
  );
}
