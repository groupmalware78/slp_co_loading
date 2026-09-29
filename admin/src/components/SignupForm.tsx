"use client";

import { useState, type FormEvent } from "react";
import { formatPhoneInput } from "@/lib/phoneFormat";

const emptyForm = {
  name: "",
  contactName: "",
  contactEmail: "",
  address: "",
  trn: "",
};

// Same fields and validation as the staff-facing "Add company" form
// (CompaniesView.tsx) — both submit through companySchema on the server
// (see registerCompany() in lib/companyRegistration.ts) — but this one is
// public (POST /api/signup, no session) and never reveals the API
// key/OTP in the response; those only ever go to the verified email.
export function SignupForm() {
  const [form, setForm] = useState(emptyForm);
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, code, contactPhone: phone }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to register company.");
      return;
    }

    setSuccess(true);
  }

  const inputClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";

  if (success) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 text-center shadow-md shadow-slate-200/50">
        <p className="text-sm font-medium text-emerald-700">
          Registration received — check {form.contactEmail} to verify your email and get your
          customer-portal setup details.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-200/70 bg-white p-6 shadow-md shadow-slate-200/50"
    >
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div>
        <label htmlFor="code" className="mb-1 block text-sm font-medium text-slate-700">
          Company code
        </label>
        <input
          id="code"
          required
          maxLength={10}
          placeholder="e.g. SLP"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          className={`${inputClass} font-mono uppercase`}
        />
      </div>
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
          Company name
        </label>
        <input
          id="name"
          required
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="contactName" className="mb-1 block text-sm font-medium text-slate-700">
          Contact name
        </label>
        <input
          id="contactName"
          required
          value={form.contactName}
          onChange={(e) => updateField("contactName", e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="contactEmail" className="mb-1 block text-sm font-medium text-slate-700">
          Contact email
        </label>
        <input
          id="contactEmail"
          type="email"
          required
          value={form.contactEmail}
          onChange={(e) => updateField("contactEmail", e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="contactPhone" className="mb-1 block text-sm font-medium text-slate-700">
          Contact phone
        </label>
        <input
          id="contactPhone"
          type="tel"
          required
          inputMode="numeric"
          pattern="\+1 \(\d{3}\) \d{3}-\d{4}"
          placeholder="+1 (000) 000-0000"
          value={phone}
          onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="address" className="mb-1 block text-sm font-medium text-slate-700">
          Address
        </label>
        <input
          id="address"
          required
          value={form.address}
          onChange={(e) => updateField("address", e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="trn" className="mb-1 block text-sm font-medium text-slate-700">
          TRN (optional)
        </label>
        <input
          id="trn"
          value={form.trn}
          onChange={(e) => updateField("trn", e.target.value)}
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-md shadow-violet-600/20 px-3 py-2 text-sm font-medium text-white transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Registering…" : "Register company"}
      </button>
    </form>
  );
}
