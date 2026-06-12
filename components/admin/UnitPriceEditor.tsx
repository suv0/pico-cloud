'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AdminSaveSuccessBanner } from '@/components/admin/AdminSaveSuccessBanner';
import { AdminRowStatusCell } from '@/components/admin/AdminRowStatusCell';

type UnitPriceRow = {
  id: string;
  dimension: string;
  pricePerUnitBdt: number;
};

const DIMENSION_LABELS: Record<string, string> = {
  vcpu: 'vCPU',
  ram_gb: 'RAM (per GB)',
  storage_gb: 'SSD (per GB)',
};

const inputClass =
  'w-full max-w-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-sm text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

type RowState = { pricePerUnitBdt: number; saving: boolean; message: string | null; error: string | null };

function toRowState(row: UnitPriceRow): RowState {
  return {
    pricePerUnitBdt: row.pricePerUnitBdt,
    saving: false,
    message: null,
    error: null,
  };
}

function hasPriceDraftChanged(row: UnitPriceRow, state?: RowState): boolean {
  return Boolean(state && state.pricePerUnitBdt !== row.pricePerUnitBdt);
}

export function UnitPriceEditor() {
  const [rows, setRows] = useState<UnitPriceRow[]>([]);
  const [editState, setEditState] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  const loadPrices = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/admin/unit-prices');
      const data: unknown = await res.json();
      if (!res.ok) {
        setLoadError((data as { error?: string }).error ?? 'Failed to load unit prices');
        return;
      }
      const list = data as UnitPriceRow[];
      setRows(list);
      setEditState(
        Object.fromEntries(
          list.map((row) => [row.dimension, toRowState(row)]),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPrices();
  }, [loadPrices]);

  function updatePrice(dimension: string, value: string) {
    setSaveMessage('');
    setSaveError('');
    setEditState((prev) => {
      const row = prev[dimension];
      if (!row) return prev;
      return {
        ...prev,
        [dimension]: { ...row, pricePerUnitBdt: Number(value), message: null, error: null },
      };
    });
  }

  function resetChangedPrices() {
    setEditState(Object.fromEntries(rows.map((row) => [row.dimension, toRowState(row)])));
    setSaveMessage('');
    setSaveError('');
  }

  function resetPrice(dimension: string) {
    const row = rows.find((item) => item.dimension === dimension);
    if (!row) return;
    setEditState((prev) => ({
      ...prev,
      [dimension]: toRowState(row),
    }));
    setSaveMessage('');
    setSaveError('');
  }

  async function saveChangedPrices() {
    const changedRows = rows
      .map((row) => ({ row, state: editState[row.dimension] }))
      .filter(({ row, state }) => hasPriceDraftChanged(row, state) && state);

    if (changedRows.length === 0) return;

    setSaveMessage('');
    setSaveError('');
    setEditState((prev) => ({
      ...prev,
      ...Object.fromEntries(
        changedRows.map(({ row, state }) => [
          row.dimension,
          { ...state, saving: true, message: null, error: null } as RowState,
        ]),
      ),
    }));

    const results = await Promise.all(
      changedRows.map(async ({ row, state }) => {
        if (!state) {
          return { dimension: row.dimension, state, ok: false, error: 'Missing draft row', updated: null };
        }
        try {
          const res = await fetch(`/api/admin/unit-prices/${row.dimension}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pricePerUnitBdt: state.pricePerUnitBdt }),
          });
          const data: unknown = await res.json();
          if (!res.ok) {
            return {
              dimension: row.dimension,
              state,
              ok: false,
              error: (data as { error?: string }).error ?? 'Save failed',
              updated: null,
            };
          }

          return {
            dimension: row.dimension,
            state,
            ok: true,
            error: null,
            updated: data as UnitPriceRow,
          };
        } catch {
          return { dimension: row.dimension, state, ok: false, error: 'Network error', updated: null };
        }
      }),
    );

    const failures = results.filter((result) => !result.ok);
    const successes = results.filter((result) => result.ok && result.updated);

    setEditState((prev) => ({
      ...prev,
      ...Object.fromEntries(
        results.map((result) => [
          result.dimension,
          {
            ...result.state,
            saving: false,
            message: result.ok ? 'Saved' : null,
            error: result.error,
          } as RowState,
        ]),
      ),
    }));

    if (failures.length > 0) {
      if (successes.length > 0) {
        setRows((prev) =>
          prev.map((row) => successes.find((result) => result.dimension === row.dimension)?.updated ?? row),
        );
      }
      setSaveError(
        `${failures.length} ${failures.length === 1 ? 'rate needs' : 'rates need'} attention. Fix the highlighted draft and save again.`,
      );
      return;
    }

    await loadPrices();
    setSaveMessage(`${results.length} ${results.length === 1 ? 'rate was' : 'rates were'} saved.`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-on-surface-variant">
        <svg className="mr-3 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Loading unit prices…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-error/20 bg-error-container p-4 text-on-error-container">
        <p>{loadError}</p>
        <button
          type="button"
          onClick={() => void loadPrices()}
          className="mt-3 font-semibold underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const changedDimensions = rows
    .filter((row) => hasPriceDraftChanged(row, editState[row.dimension]))
    .map((row) => row.dimension);
  const hasChanges = changedDimensions.length > 0;
  const isSaving = Object.values(editState).some((row) => row.saving);

  return (
    <div className="space-y-4">
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        These per-dimension rates drive the custom VM configurator and the unit-cost preview on fixed packages.
        Changes apply immediately to new provisions and landing-page custom estimates.
      </p>

      <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-section-title text-section-title text-on-surface">
            {hasChanges
              ? `${changedDimensions.length} unsaved ${changedDimensions.length === 1 ? 'rate' : 'rates'}`
              : saveMessage
                ? 'All unit prices saved'
                : 'No unsaved unit price changes'}
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Update several unit rates together, then save once or reset back to the last saved prices.
          </p>
          {saveError && <p className="mt-2 text-sm font-medium text-error">{saveError}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={!hasChanges || isSaving} onClick={resetChangedPrices}>
            Reset changes
          </Button>
          <Button loading={isSaving} disabled={!hasChanges || isSaving} onClick={() => void saveChangedPrices()}>
            Save changes
          </Button>
        </div>
      </div>

      {saveMessage && (
        <AdminSaveSuccessBanner
          title="Unit prices saved"
          message={saveMessage}
          hint="Custom VM pricing and package unit-cost previews update on the customer site immediately."
          onDismiss={() => setSaveMessage('')}
        />
      )}

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <table className="min-w-full text-left">
          <thead className="border-b border-outline-variant bg-surface-container-low">
            <tr>
              {['Dimension', 'Rate (৳/unit/mo)', 'Status'].map((h) => (
                <th key={h} className="px-6 py-3 font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {rows.map((row) => {
              const state = editState[row.dimension] ?? {
                pricePerUnitBdt: row.pricePerUnitBdt,
                saving: false,
                message: null,
                error: null,
              };
              const isDirty = changedDimensions.includes(row.dimension);

              return (
                <tr key={row.id} className={isDirty ? 'bg-primary/5' : ''}>
                  <td className="px-6 py-4 font-section-title text-section-title">
                    {DIMENSION_LABELS[row.dimension] ?? row.dimension}
                    <div className="font-code-inline text-xs text-on-surface-variant">{row.dimension}</div>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      min={1}
                      className={inputClass}
                      value={state.pricePerUnitBdt}
                      onChange={(e) => updatePrice(row.dimension, e.target.value)}
                    />
                  </td>
                  <td className="px-6 py-4 align-top">
                    <AdminRowStatusCell
                      isDirty={isDirty}
                      saving={state.saving}
                      message={state.message}
                      error={state.error}
                      onReset={() => resetPrice(row.dimension)}
                      resetDisabled={isSaving}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
