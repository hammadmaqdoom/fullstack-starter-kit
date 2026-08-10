'use client';

import { ApiRequestError } from '@/libs/api/client';
import type {
  WorkerImportBatch,
  WorkerImportPreview,
} from '@/libs/api/worker-import';
import {
  enqueueWorkerImport,
  listWorkerImportBatches,
  previewWorkerImport,
} from '@/libs/api/worker-import';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { useCallback, useEffect, useState } from 'react';

type Props = {
  visible: boolean;
  onHide: () => void;
  onImported?: () => void;
};

export function WorkerImportDialog({ visible, onHide, onImported }: Props) {
  const t = useTranslations('WorkerImport');
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<WorkerImportPreview | null>(null);
  const [batches, setBatches] = useState<WorkerImportBatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [enqueueing, setEnqueueing] = useState(false);

  const loadBatches = useCallback(async () => {
    try {
      const { data } = await listWorkerImportBatches();
      setBatches(data ?? []);
    } catch {
      setBatches([]);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      void loadBatches();
    }
  }, [visible, loadBatches]);

  const handlePreview = async () => {
    setPreviewing(true);
    setError(null);
    setPreview(null);
    try {
      const { data } = await previewWorkerImport(csv);
      setPreview(data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_preview'));
    } finally {
      setPreviewing(false);
    }
  };

  const handleEnqueue = async () => {
    setEnqueueing(true);
    setError(null);
    try {
      await enqueueWorkerImport(csv, fileName.trim() || undefined);
      setCsv('');
      setFileName('');
      setPreview(null);
      await loadBatches();
      onImported?.();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_enqueue'));
    } finally {
      setEnqueueing(false);
    }
  };

  const handleHide = () => {
    setError(null);
    onHide();
  };

  return (
    <Dialog
      header={t('title')}
      visible={visible}
      onHide={handleHide}
      className="w-full max-w-3xl"
      modal
      dismissableMask
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{t('help')}</p>
        {error && <Message severity="error" text={error} className="w-full" />}

        <label className="block text-sm">
          <span className="mb-1 block text-gray-700">{t('field_filename')}</span>
          <InputText
            value={fileName}
            onChange={e => setFileName(e.target.value)}
            className="w-full"
            placeholder={t('field_filename_placeholder')}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-gray-700">{t('field_csv')}</span>
          <InputTextarea
            value={csv}
            onChange={e => setCsv(e.target.value)}
            rows={10}
            className="w-full font-mono text-xs"
            autoResize={false}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            outlined
            loading={previewing}
            disabled={!csv.trim()}
            onClick={() => void handlePreview()}
          >
            {t('preview')}
          </Button>
          <Button
            type="button"
            loading={enqueueing}
            disabled={!csv.trim() || (preview !== null && preview.invalidCount > 0)}
            onClick={() => void handleEnqueue()}
          >
            {t('enqueue')}
          </Button>
        </div>

        {preview && (
          <div className="space-y-2 rounded-lg border border-gray-200 p-3">
            <p className="text-sm text-gray-700">
              {t('preview_summary', {
                total: preview.totalRows,
                valid: preview.validCount,
                invalid: preview.invalidCount,
              })}
            </p>
            {preview.invalidCount > 0 && (
              <DataTable
                value={preview.rows.filter(r => !r.isValid)}
                size="small"
                paginator
                rows={5}
              >
                <Column field="rowNumber" header={t('col_row')} />
                <Column
                  header={t('col_email')}
                  body={row => row.data.email ?? '—'}
                />
                <Column
                  header={t('col_errors')}
                  body={row => row.errors.join('; ')}
                />
              </DataTable>
            )}
          </div>
        )}

        {batches.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">{t('recent_batches')}</h3>
            <DataTable value={batches} size="small">
              <Column
                field="fileName"
                header={t('col_file')}
                body={row => row.fileName ?? '—'}
              />
              <Column field="status" header={t('col_status')} />
              <Column field="totalRows" header={t('col_rows')} />
              <Column field="createdAt" header={t('col_created')} />
            </DataTable>
          </div>
        )}
      </div>
    </Dialog>
  );
}
