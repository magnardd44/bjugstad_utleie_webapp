// components/Spinner.tsx
"use client";

export default function Spinner({
  label = "Laster...",
  size = 56, // px – make it big by default
}: {
  label?: string;
  size?: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <svg
        className="animate-spin"
        style={{ width: size, height: size }}
        viewBox="0 0 24 24"
        fill="none"
        role="status"
        aria-label={label}
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <span className="text-sm text-slate-500">{label}</span>
    </div>
  );
}
