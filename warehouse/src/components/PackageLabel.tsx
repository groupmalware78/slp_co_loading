"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export function PackageLabel({
  trackingNumber,
  customerCode,
  customerName,
  description,
  companyName,
  weightLbs,
}: {
  trackingNumber: string;
  customerCode: string | null;
  customerName: string | null;
  description: string | null;
  companyName: string | null;
  weightLbs: number | null;
}) {
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!barcodeRef.current) return;
    JsBarcode(barcodeRef.current, trackingNumber, {
      format: "CODE128",
      displayValue: false,
      height: 60,
      width: 2,
      margin: 0,
    });
  }, [trackingNumber]);

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 bg-slate-100 p-6 print:m-0 print:min-h-0 print:bg-white print:p-0">
      <style>{`
        @media print {
          @page { size: 4in 6in; margin: 0.15in; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print flex items-center gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Print label
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Close
        </button>
      </div>

      <div className="w-[4in] rounded-md border border-slate-300 bg-white p-4 shadow-sm print:w-full print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <p className="text-center text-sm font-bold uppercase tracking-wide text-slate-900">
          {companyName ?? "Freight Forwarder"}
        </p>

        <div className="mt-3 flex flex-col items-center">
          <svg ref={barcodeRef} className="w-full" />
          <p className="mt-1 break-all text-center font-mono text-sm font-semibold text-slate-900">
            {trackingNumber}
          </p>
        </div>

        <dl className="mt-3 space-y-1.5 border-t border-slate-200 pt-3 text-sm">
          <Row label="Customer ID" value={customerCode ?? "—"} />
          <Row label="Customer" value={customerName ?? "—"} />
          <Row label="Description" value={description ?? "—"} />
          <Row label="Weight" value={weightLbs != null ? `${weightLbs} lbs` : "—"} />
        </dl>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 font-medium text-slate-500">{label}</dt>
      <dd className="text-right text-slate-900">{value}</dd>
    </div>
  );
}
