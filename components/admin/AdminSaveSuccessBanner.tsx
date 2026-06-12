type AdminSaveSuccessBannerProps = {
  title: string;
  message: string;
  hint?: string;
  onDismiss?: () => void;
};

export function AdminSaveSuccessBanner({
  title,
  message,
  hint,
  onDismiss,
}: AdminSaveSuccessBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-900"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="material-symbols-outlined shrink-0 text-emerald-600">check_circle</span>
        <div className="min-w-0">
          <p className="font-section-title text-section-title text-emerald-900">{title}</p>
          <p className="mt-1 font-body-sm text-body-sm text-emerald-800">{message}</p>
          {hint && (
            <p className="mt-1 font-body-sm text-body-sm text-emerald-700">{hint}</p>
          )}
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-1 text-emerald-700 transition-colors hover:bg-emerald-100"
          aria-label="Dismiss success message"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      )}
    </div>
  );
}
