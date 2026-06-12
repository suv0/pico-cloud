type AdminRowStatusCellProps = {
  isDirty: boolean;
  saving?: boolean;
  message?: string | null;
  error?: string | null;
  onReset?: () => void;
  resetDisabled?: boolean;
};

export function AdminRowStatusCell({
  isDirty,
  saving = false,
  message,
  error,
  onReset,
  resetDisabled = false,
}: AdminRowStatusCellProps) {
  if (!isDirty && !message && !error) {
    return (
      <span className="font-body-sm text-body-sm text-outline" aria-hidden="true">
        —
      </span>
    );
  }

  return (
    <div className="flex min-w-[9rem] flex-col gap-2">
      {isDirty && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
            <span className="material-symbols-outlined text-[14px] leading-none">edit_note</span>
            Unsaved
          </span>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              disabled={resetDisabled || saving}
              className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[14px] leading-none">undo</span>
              Reset row
            </button>
          )}
        </div>
      )}

      {message && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
          <span className="material-symbols-outlined text-[14px] leading-none">check</span>
          {message}
        </span>
      )}

      {error && (
        <span className="inline-flex items-start gap-1 text-xs font-medium leading-snug text-error">
          <span className="material-symbols-outlined shrink-0 text-[14px] leading-none">error</span>
          {error}
        </span>
      )}
    </div>
  );
}
