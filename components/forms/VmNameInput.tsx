'use client';

import { useState } from 'react';
import { sanitizeVmNameInput } from '@/lib/validation/sanitizeVmNameInput';
import { DEFAULT_VM_NAME, validateVmName } from '@/lib/validation/vmName';

type VmNameInputProps = {
  value: string;
  onChange: (value: string) => void;
  inputId?: string;
  autoFocus?: boolean;
};

export function VmNameInput({ value, onChange, inputId = 'vm-name', autoFocus }: VmNameInputProps) {
  const [strippedChars, setStrippedChars] = useState(false);
  const isEmpty = !value.trim();
  const nameError = !isEmpty ? validateVmName(value) : null;
  const stripError = strippedChars
    ? 'Only lowercase letters, numbers, and hyphens are allowed — spaces and symbols are removed as you type.'
    : null;
  const displayError = stripError ?? nameError;

  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-body-sm font-medium text-on-surface">
        VM name <span className="text-error">*</span>
      </label>
      <input
        id={inputId}
        type="text"
        required
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          const sanitized = sanitizeVmNameInput(raw);
          setStrippedChars(raw !== sanitized);
          onChange(sanitized);
        }}
        placeholder={DEFAULT_VM_NAME}
        aria-invalid={displayError || isEmpty ? true : undefined}
        aria-describedby={
          displayError ? `${inputId}-error` : isEmpty ? `${inputId}-required` : `${inputId}-hint`
        }
        className={`w-full rounded-lg border px-3 py-2 font-code-inline text-code-inline focus:outline-none focus:ring-2 ${
          displayError
            ? 'border-error focus:ring-error/30'
            : isEmpty
              ? 'border-amber-500 focus:border-amber-600 focus:ring-amber-500/20'
              : 'border-outline-variant focus:border-primary focus:ring-primary/20'
        }`}
      />
      {displayError ? (
        <p id={`${inputId}-error`} className="mt-1 text-body-sm text-error">
          {displayError}
        </p>
      ) : isEmpty ? (
        <p
          id={`${inputId}-required`}
          className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-body-sm text-amber-900"
        >
          Required — name your VM before provisioning.
        </p>
      ) : (
        <p id={`${inputId}-hint`} className="mt-1 text-body-sm text-on-surface-variant">
          Lowercase letters, numbers, and hyphens only — no spaces.
          Name it <code className="rounded bg-surface-container px-1">fail</code> or{' '}
          <code className="rounded bg-surface-container px-1">fail-test</code> to demo the failure path.
        </p>
      )}
    </div>
  );
}
