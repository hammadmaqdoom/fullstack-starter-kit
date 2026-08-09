'use client';

import type {
  DocumentTemplate,
  DocumentTemplateVersion,
  MergeFieldSchema,
} from '@/libs/api/documents';
import type { DirectoryEntry } from '@/libs/api/org';
import {
  FilePlus2,
  Pencil,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { WorkerPicker } from '@/components/shared/WorkerPicker';
import { ApiRequestError } from '@/libs/api/client';
import {
  createDocumentTemplateVersion,
  extractMergeFieldTokens,
  generateDocument,
  listDocumentTemplateVersions,
  publishDocumentTemplateVersion,
} from '@/libs/api/documents';

type MergeFieldDraft = {
  key: string;
  label: string;
};

type DocumentTemplateWorkspaceProps = {
  template: DocumentTemplate | null;
  visible: boolean;
  onHide: () => void;
  onChanged?: () => void;
};

function schemaToDrafts(schema: MergeFieldSchema | Record<string, unknown> | undefined): MergeFieldDraft[] {
  if (!schema) {
    return [];
  }
  return Object.entries(schema).map(([key, value]) => {
    const label
      = value && typeof value === 'object' && 'label' in value && typeof value.label === 'string'
        ? value.label
        : key;
    return { key, label };
  });
}

function draftsToSchema(fields: MergeFieldDraft[]): Record<string, { label: string; required: boolean }> {
  const schema: Record<string, { label: string; required: boolean }> = {};
  for (const field of fields) {
    const key = field.key.trim();
    if (!key) {
      continue;
    }
    schema[key] = { label: field.label.trim() || key, required: true };
  }
  return schema;
}

function resolvePreview(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, token: string) => {
    const value = values[token];
    return value !== undefined && value !== '' ? value : `{{${token}}}`;
  });
}

export function DocumentTemplateWorkspace({
  template,
  visible,
  onHide,
  onChanged,
}: DocumentTemplateWorkspaceProps) {
  const t = useTranslations('DocumentTemplates');
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [versions, setVersions] = useState<DocumentTemplateVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState('');
  const [mergeFields, setMergeFields] = useState<MergeFieldDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const [previewWorker, setPreviewWorker] = useState<DirectoryEntry | null>(null);
  const [sampleValues, setSampleValues] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);

  const loadVersions = useCallback(async (templateId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await listDocumentTemplateVersions(templateId);
      setVersions(data ?? []);
    } catch (err) {
      setVersions([]);
      setError(err instanceof ApiRequestError ? err.message : t('error_versions_load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!visible || !template) {
      return;
    }
    setComposing(false);
    setBody('');
    setMergeFields([]);
    setSuccess(null);
    setError(null);
    setPreviewWorker(null);
    setSampleValues({});
    void loadVersions(template.id);
  }, [visible, template, loadVersions]);

  const undeclaredTokens = useMemo(() => {
    const declared = new Set(mergeFields.map(f => f.key.trim()).filter(Boolean));
    return extractMergeFieldTokens(body).filter(token => !declared.has(token));
  }, [body, mergeFields]);

  const livePreview = useMemo(
    () => resolvePreview(body, sampleValues),
    [body, sampleValues],
  );

  const publishedVersion = useMemo(() => {
    return versions
      .filter(v => v.status === 'published')
      .sort((a, b) => b.version - a.version)[0] ?? null;
  }, [versions]);

  const startNewDraft = (from?: DocumentTemplateVersion) => {
    setComposing(true);
    setSuccess(null);
    setError(null);
    if (from) {
      setBody(from.body);
      setMergeFields(schemaToDrafts(from.mergeFieldSchema));
      const values: Record<string, string> = {};
      for (const token of extractMergeFieldTokens(from.body)) {
        values[token] = '';
      }
      setSampleValues(values);
    } else {
      setBody('Dear {{worker.firstName}},\n\n');
      setMergeFields([{ key: 'worker.firstName', label: 'First name' }]);
      setSampleValues({ 'worker.firstName': '' });
    }
  };

  const insertToken = (key: string) => {
    const token = `{{${key}}}`;
    const el = bodyRef.current;
    if (!el) {
      setBody(prev => `${prev}${token}`);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = `${body.slice(0, start)}${token}${body.slice(end)}`;
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + token.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const handleSaveDraft = async () => {
    if (!template) {
      return;
    }
    if (!body.trim()) {
      setError(t('error_body_required'));
      return;
    }

    const schema = draftsToSchema(mergeFields);
    for (const token of undeclaredTokens) {
      schema[token] = { label: token, required: true };
    }
    if (undeclaredTokens.length > 0) {
      setMergeFields(prev => [
        ...prev,
        ...undeclaredTokens.map(token => ({ key: token, label: token })),
      ]);
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await createDocumentTemplateVersion(template.id, {
        body,
        mergeFieldSchema: schema,
      });
      setSuccess(t('draft_saved'));
      setComposing(false);
      await loadVersions(template.id);
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save_draft'));
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (versionId: string) => {
    if (!template) {
      return;
    }
    setPublishingId(versionId);
    setError(null);
    setSuccess(null);
    try {
      await publishDocumentTemplateVersion(template.id, versionId);
      setSuccess(t('version_published'));
      await loadVersions(template.id);
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_publish'));
    } finally {
      setPublishingId(null);
    }
  };

  const handleGenerate = async () => {
    if (!publishedVersion) {
      return;
    }
    if (!previewWorker) {
      setError(t('error_worker_required'));
      return;
    }
    setGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const mergeData: Record<string, unknown> = { ...sampleValues };
      const { data } = await generateDocument({
        templateVersionId: publishedVersion.id,
        workerId: previewWorker.id,
        mergeData,
      });
      setSuccess(t('generate_success', { id: data.id.slice(0, 8) }));
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_generate'));
    } finally {
      setGenerating(false);
    }
  };

  if (!template) {
    return null;
  }

  return (
    <Dialog
      header={`${t('workspace_title')} — ${template.name || template.code}`}
      visible={visible}
      onHide={onHide}
      modal
      dismissableMask
      className="w-full max-w-4xl"
      contentClassName="max-h-[80vh] overflow-y-auto"
    >
      <div className="space-y-5">
        <p className="text-sm text-gray-500">{t('versions_subtitle')}</p>

        {error && <Message severity="error" text={error} className="w-full" />}
        {success && <Message severity="success" text={success} className="w-full" />}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{t('col_version')}</h3>
          <Button
            type="button"
            size="small"
            className="gap-1.5"
            disabled={loading || composing}
            onClick={() => startNewDraft(versions[0])}
          >
            <FilePlus2 className="size-3.5" aria-hidden />
            {t('new_draft')}
          </Button>
        </div>

        {loading && <p className="text-sm text-gray-500">{t('saving')}</p>}

        {!loading && versions.length === 0 && !composing && (
          <EmptyState
            icon={Pencil}
            title={t('empty_versions_title')}
            description={t('empty_versions_description')}
            actionLabel={t('new_draft')}
            onAction={() => startNewDraft()}
          />
        )}

        {!loading && versions.length > 0 && (
          <ul className="space-y-2">
            {versions.map(version => {
              const fieldCount = Object.keys(version.mergeFieldSchema ?? {}).length;
              return (
                <li
                  key={version.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {t('version_label', { version: version.version })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {fieldCount > 0
                        ? t('merge_field_count', { count: fieldCount })
                        : t('no_merge_fields')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag
                      value={t(`status_${version.status}` as 'status_draft')}
                      severity={version.status === 'published' ? 'success' : 'secondary'}
                    />
                    {version.status === 'draft' && (
                      <>
                        <Button
                          type="button"
                          size="small"
                          severity="secondary"
                          outlined
                          onClick={() => startNewDraft(version)}
                        >
                          {t('preview')}
                        </Button>
                        <Button
                          type="button"
                          size="small"
                          className="gap-1"
                          disabled={publishingId === version.id}
                          onClick={() => void handlePublish(version.id)}
                        >
                          <Send className="size-3.5" aria-hidden />
                          {publishingId === version.id ? t('publishing') : t('publish')}
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {composing && (
          <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-semibold text-gray-900">{t('composer_title')}</h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-gray-600">{t('merge_fields_label')}</label>
                <Button
                  type="button"
                  size="small"
                  text
                  className="gap-1"
                  onClick={() => setMergeFields(prev => [...prev, { key: '', label: '' }])}
                >
                  <Plus className="size-3.5" aria-hidden />
                  {t('add_merge_field')}
                </Button>
              </div>
              {mergeFields.length === 0 && (
                <p className="text-xs text-gray-500">{t('no_merge_fields_hint')}</p>
              )}
              <ul className="space-y-2">
                {mergeFields.map((field, index) => (
                  <li key={`mf-${index}`} className="flex flex-wrap items-center gap-2">
                    <InputText
                      value={field.key}
                      placeholder={t('field_key_placeholder')}
                      className="min-w-[10rem] flex-1"
                      onChange={(e) => {
                        const value = e.target.value;
                        setMergeFields(prev => prev.map((row, i) => (i === index ? { ...row, key: value } : row)));
                      }}
                    />
                    <InputText
                      value={field.label}
                      placeholder={t('field_label_placeholder')}
                      className="min-w-[8rem] flex-1"
                      onChange={(e) => {
                        const value = e.target.value;
                        setMergeFields(prev => prev.map((row, i) => (i === index ? { ...row, label: value } : row)));
                      }}
                    />
                    <Button
                      type="button"
                      size="small"
                      outlined
                      disabled={!field.key.trim()}
                      onClick={() => insertToken(field.key.trim())}
                    >
                      {t('insert_token')}
                    </Button>
                    <Button
                      type="button"
                      size="small"
                      severity="danger"
                      text
                      aria-label={t('remove')}
                      onClick={() => setMergeFields(prev => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
              {undeclaredTokens.length > 0 && (
                <Message
                  severity="warn"
                  text={t('invalid_tokens_warning', { tokens: undeclaredTokens.join(', ') })}
                  className="w-full"
                />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="tpl-body" className="text-xs font-medium text-gray-600">{t('body_label')}</label>
              <InputTextarea
                id="tpl-body"
                ref={bodyRef}
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={10}
                className="w-full font-mono text-sm"
                autoResize
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                severity="secondary"
                outlined
                onClick={() => setComposing(false)}
              >
                {t('cancel')}
              </Button>
              <Button
                type="button"
                loading={saving}
                onClick={() => void handleSaveDraft()}
              >
                {saving ? t('saving') : t('save_draft')}
              </Button>
            </div>
          </div>
        )}

        {publishedVersion && (
          <div className="space-y-3 rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900">{t('preview_title')}</h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">{t('field_worker')}</label>
              <WorkerPicker
                value={previewWorker}
                onChange={setPreviewWorker}
                placeholder={t('field_worker_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">{t('sample_values_label')}</p>
              {extractMergeFieldTokens(publishedVersion.body).map(token => (
                <div key={token} className="flex items-center gap-2">
                  <span className="w-40 shrink-0 truncate font-mono text-xs text-gray-500">{`{{${token}}}`}</span>
                  <InputText
                    className="w-full"
                    value={sampleValues[token] ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSampleValues(prev => ({ ...prev, [token]: value }));
                    }}
                  />
                </div>
              ))}
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-gray-600">{t('live_preview_label')}</p>
              <pre className="whitespace-pre-wrap rounded-lg border border-gray-100 bg-white p-3 text-sm text-gray-800">
                {resolvePreview(publishedVersion.body, sampleValues) || livePreview}
              </pre>
            </div>
            <Button
              type="button"
              className="gap-1.5"
              loading={generating}
              disabled={!previewWorker}
              onClick={() => void handleGenerate()}
            >
              {generating ? t('generating') : t('generate_document')}
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
