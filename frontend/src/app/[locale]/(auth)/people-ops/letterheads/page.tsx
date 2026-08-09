'use client';

import type {
  LegalEntity,
  LetterheadConfig,
  LetterheadLayout,
  RenderProfile,
} from '@/libs/api/documents';
import {
  AlertCircle,
  FileStack,
  Plus,
  RefreshCw,
  Stamp,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { OfflineBanner, useOnlineStatus } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import {
  createLetterheadConfig,
  listLegalEntities,
  listLetterheadConfigs,
  updateLegalEntityDocumentOutput,
} from '@/libs/api/documents';

const RENDER_PROFILES: RenderProfile[] = ['full_digital', 'print_on_letterhead', 'informational'];

function defaultLayout(): LetterheadLayout {
  return {
    logo: { position: 'top_left', maxHeightPx: 60 },
    header: { showRegisteredName: true, showTradingName: true, showAddress: true },
    footer: { showPageNumbers: true, customText: '' },
    margins: { top: 25, bottom: 20, left: 20, right: 20 },
    physicalStock: {
      enabled: false,
      contentTopMarginMm: 40,
      contentBottomMarginMm: 30,
      showPrintWatermark: false,
    },
  };
}

function entityDisplayName(entity: LegalEntity): string {
  return entity.tradingName?.trim() || entity.registeredName;
}

export default function PeopleOpsLetterheadsPage() {
  const t = useTranslations('LetterheadAdmin');
  const isOnline = useOnlineStatus();

  const [entities, setEntities] = useState<LegalEntity[]>([]);
  const [configs, setConfigs] = useState<LetterheadConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [versionDialogEntity, setVersionDialogEntity] = useState<LegalEntity | null>(null);
  const [layout, setLayout] = useState<LetterheadLayout>(() => defaultLayout());
  const [logoBlobUrl, setLogoBlobUrl] = useState('');
  const [versionSaving, setVersionSaving] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);

  const [outputDrafts, setOutputDrafts] = useState<Record<string, {
    requiresWetStamp: boolean;
    stampInstructions: string;
    defaultRenderProfile: RenderProfile;
  }>>({});
  const [savingOutputId, setSavingOutputId] = useState<string | null>(null);
  const [outputSavedId, setOutputSavedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [entitiesRes, configsRes] = await Promise.all([
        listLegalEntities(),
        listLetterheadConfigs(),
      ]);
      setEntities(entitiesRes.data);
      setConfigs(configsRes.data);
      setOutputDrafts(
        Object.fromEntries(entitiesRes.data.map(entity => [entity.id, {
          requiresWetStamp: entity.requiresWetStamp,
          stampInstructions: entity.stampInstructions ?? '',
          defaultRenderProfile: entity.defaultRenderProfile,
        }])),
      );
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setEntities([]);
      setConfigs([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const currentConfigByEntity = useMemo(() => {
    const map = new Map<string, LetterheadConfig>();
    for (const config of configs) {
      if (config.isCurrent) {
        map.set(config.legalEntityId, config);
      }
    }
    return map;
  }, [configs]);

  const versionCountByEntity = useMemo(() => {
    const map = new Map<string, number>();
    for (const config of configs) {
      map.set(config.legalEntityId, (map.get(config.legalEntityId) ?? 0) + 1);
    }
    return map;
  }, [configs]);

  const openVersionDialog = (entity: LegalEntity) => {
    setVersionDialogEntity(entity);
    setLayout(currentConfigByEntity.get(entity.id)?.layoutJson ?? defaultLayout());
    setLogoBlobUrl('');
    setVersionError(null);
  };

  const handleCreateVersion = async () => {
    if (!versionDialogEntity) {
      return;
    }
    setVersionSaving(true);
    setVersionError(null);
    try {
      await createLetterheadConfig({
        legalEntityId: versionDialogEntity.id,
        layout,
        logoBlobUrl: logoBlobUrl.trim() || undefined,
      });
      setVersionDialogEntity(null);
      await load();
    } catch (err) {
      setVersionError(err instanceof ApiRequestError ? err.message : t('error_save_version'));
    } finally {
      setVersionSaving(false);
    }
  };

  const handleSaveOutput = async (entityId: string) => {
    const draft = outputDrafts[entityId];
    if (!draft) {
      return;
    }
    setSavingOutputId(entityId);
    setOutputSavedId(null);
    try {
      await updateLegalEntityDocumentOutput(entityId, {
        requiresWetStamp: draft.requiresWetStamp,
        stampInstructions: draft.stampInstructions.trim() || undefined,
        defaultRenderProfile: draft.defaultRenderProfile,
      });
      setOutputSavedId(entityId);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_save_output'));
    } finally {
      setSavingOutputId(null);
    }
  };

  if (isLoading) {
    return <PageSkeleton variant="list" rows={3} />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <OfflineBanner />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <Button
          type="button"
          severity="secondary"
          outlined
          className="gap-2 self-start"
          disabled={isLoading}
          onClick={() => void load()}
        >
          <RefreshCw className="size-4" aria-hidden />
          {t('refresh')}
        </Button>
      </div>

      {error && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </div>
          <Button type="button" severity="secondary" size="small" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      )}

      {!error && entities.length === 0 && (
        <EmptyState
          icon={FileStack}
          title={t('empty_title')}
          description={t('empty_description')}
        />
      )}

      {!error && entities.length > 0 && (
        <div className="space-y-4">
          {entities.map((entity) => {
            const current = currentConfigByEntity.get(entity.id);
            const versionCount = versionCountByEntity.get(entity.id) ?? 0;
            const draft = outputDrafts[entity.id];

            return (
              <div key={entity.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-gray-900">{entityDisplayName(entity)}</h2>
                      <Tag value={entity.countryCode} severity="info" />
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">{entity.code}</p>
                  </div>
                  <Button
                    type="button"
                    size="small"
                    className="gap-1.5"
                    onClick={() => openVersionDialog(entity)}
                  >
                    <Plus className="size-3.5" aria-hidden />
                    {t('publish_version')}
                  </Button>
                </div>

                <div className="mt-4 rounded-lg bg-gray-50 p-3">
                  {current
                    ? (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                          <span className="font-medium text-gray-900">
                            {t('current_version', { version: current.version })}
                          </span>
                          <span>
                            {t('effective_from', { date: current.effectiveFrom.slice(0, 10) })}
                          </span>
                          <span>{t('version_count', { count: versionCount })}</span>
                          {current.layoutJson.physicalStock?.enabled && (
                            <Tag value={t('physical_stock_enabled')} severity="success" />
                          )}
                        </div>
                      )
                    : (
                        <p className="text-xs text-gray-500">{t('no_version_yet')}</p>
                      )}
                </div>

                {draft && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      <Stamp className="size-3.5" aria-hidden />
                      {t('document_output_settings')}
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-center justify-between gap-2 sm:col-span-2">
                        <label htmlFor={`wet-stamp-${entity.id}`} className="text-sm text-gray-700">
                          {t('requires_wet_stamp')}
                        </label>
                        <InputSwitch
                          inputId={`wet-stamp-${entity.id}`}
                          checked={draft.requiresWetStamp}
                          onChange={e => setOutputDrafts(prev => ({
                            ...prev,
                            [entity.id]: { ...draft, requiresWetStamp: e.value },
                          }))}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor={`stamp-instructions-${entity.id}`} className="mb-1 block text-xs font-medium text-gray-600">
                          {t('stamp_instructions')}
                        </label>
                        <InputTextarea
                          id={`stamp-instructions-${entity.id}`}
                          value={draft.stampInstructions}
                          onChange={e => setOutputDrafts(prev => ({
                            ...prev,
                            [entity.id]: { ...draft, stampInstructions: e.target.value },
                          }))}
                          rows={2}
                          disabled={!draft.requiresWetStamp}
                          placeholder={t('stamp_instructions_placeholder')}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label htmlFor={`render-profile-${entity.id}`} className="mb-1 block text-xs font-medium text-gray-600">
                          {t('default_render_profile')}
                        </label>
                        <Dropdown
                          inputId={`render-profile-${entity.id}`}
                          value={draft.defaultRenderProfile}
                          options={RENDER_PROFILES.map(value => ({ label: t(`render_profile_${value}`), value }))}
                          onChange={e => setOutputDrafts(prev => ({
                            ...prev,
                            [entity.id]: { ...draft, defaultRenderProfile: e.value },
                          }))}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Button
                        type="button"
                        size="small"
                        severity="secondary"
                        outlined
                        loading={savingOutputId === entity.id}
                        disabled={!isOnline}
                        onClick={() => void handleSaveOutput(entity.id)}
                      >
                        {t('save_settings')}
                      </Button>
                      {outputSavedId === entity.id && (
                        <span className="text-xs text-green-700">{t('settings_saved')}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        header={versionDialogEntity ? t('publish_version_for', { entity: entityDisplayName(versionDialogEntity) }) : t('publish_version')}
        visible={versionDialogEntity !== null}
        onHide={() => setVersionDialogEntity(null)}
        modal
        dismissableMask
        className="w-full max-w-lg"
      >
        <div className="space-y-4">
          {versionError && <Message severity="error" text={versionError} className="w-full" />}
          <Message severity="info" text={t('new_version_hint')} className="w-full" />

          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">{t('header_section')}</h3>
            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm text-gray-700">
                {t('show_registered_name')}
                <InputSwitch
                  checked={layout.header?.showRegisteredName ?? true}
                  onChange={e => setLayout(prev => ({ ...prev, header: { ...prev.header, showRegisteredName: e.value } }))}
                />
              </label>
              <label className="flex items-center justify-between text-sm text-gray-700">
                {t('show_trading_name')}
                <InputSwitch
                  checked={layout.header?.showTradingName ?? true}
                  onChange={e => setLayout(prev => ({ ...prev, header: { ...prev.header, showTradingName: e.value } }))}
                />
              </label>
              <label className="flex items-center justify-between text-sm text-gray-700">
                {t('show_address')}
                <InputSwitch
                  checked={layout.header?.showAddress ?? true}
                  onChange={e => setLayout(prev => ({ ...prev, header: { ...prev.header, showAddress: e.value } }))}
                />
              </label>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">{t('footer_section')}</h3>
            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm text-gray-700">
                {t('show_page_numbers')}
                <InputSwitch
                  checked={layout.footer?.showPageNumbers ?? true}
                  onChange={e => setLayout(prev => ({ ...prev, footer: { ...prev.footer, showPageNumbers: e.value } }))}
                />
              </label>
              <InputText
                value={layout.footer?.customText ?? ''}
                onChange={e => setLayout(prev => ({ ...prev, footer: { ...prev.footer, customText: e.target.value } }))}
                placeholder={t('footer_custom_text_placeholder')}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">{t('margins_section')}</h3>
            <div className="grid grid-cols-4 gap-2">
              {(['top', 'bottom', 'left', 'right'] as const).map(side => (
                <div key={side}>
                  <label className="mb-1 block text-xs text-gray-500">{t(`margin_${side}`)}</label>
                  <InputNumber
                    value={layout.margins?.[side] ?? 0}
                    onValueChange={e => setLayout(prev => ({ ...prev, margins: { ...prev.margins, [side]: e.value ?? 0 } }))}
                    suffix="mm"
                    inputClassName="w-full"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 flex items-center justify-between text-xs font-semibold tracking-wide text-gray-500 uppercase">
              {t('physical_stock_section')}
              <InputSwitch
                checked={layout.physicalStock?.enabled ?? false}
                onChange={e => setLayout(prev => ({ ...prev, physicalStock: { ...prev.physicalStock, enabled: e.value } }))}
              />
            </h3>
            {layout.physicalStock?.enabled && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">{t('content_top_margin')}</label>
                  <InputNumber
                    value={layout.physicalStock?.contentTopMarginMm ?? 0}
                    onValueChange={e => setLayout(prev => ({ ...prev, physicalStock: { ...prev.physicalStock, contentTopMarginMm: e.value ?? 0 } }))}
                    suffix="mm"
                    inputClassName="w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">{t('content_bottom_margin')}</label>
                  <InputNumber
                    value={layout.physicalStock?.contentBottomMarginMm ?? 0}
                    onValueChange={e => setLayout(prev => ({ ...prev, physicalStock: { ...prev.physicalStock, contentBottomMarginMm: e.value ?? 0 } }))}
                    suffix="mm"
                    inputClassName="w-full"
                  />
                </div>
                <label className="col-span-2 flex items-center justify-between text-sm text-gray-700">
                  {t('show_print_watermark')}
                  <InputSwitch
                    checked={layout.physicalStock?.showPrintWatermark ?? false}
                    onChange={e => setLayout(prev => ({ ...prev, physicalStock: { ...prev.physicalStock, showPrintWatermark: e.value } }))}
                  />
                </label>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="letterhead-logo-url" className="mb-1 block text-xs font-medium text-gray-600">{t('logo_blob_url')}</label>
            <InputText
              id="letterhead-logo-url"
              value={logoBlobUrl}
              onChange={e => setLogoBlobUrl(e.target.value)}
              placeholder={t('logo_blob_url_placeholder')}
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" severity="secondary" outlined onClick={() => setVersionDialogEntity(null)}>
              {t('cancel')}
            </Button>
            <Button type="button" className="gap-2" loading={versionSaving} onClick={() => void handleCreateVersion()}>
              <Plus className="size-4" aria-hidden />
              {t('publish')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
