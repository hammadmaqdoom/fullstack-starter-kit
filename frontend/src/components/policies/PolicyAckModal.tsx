'use client';

import type { PendingPolicyAcknowledgement } from '@/libs/api/policies';
import { resolvePolicyBody } from '@/libs/policies/policy-body';
import { ExternalLink, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { useEffect, useMemo, useState } from 'react';

type PolicyAckModalProps = {
  policy: PendingPolicyAcknowledgement | null;
  visible: boolean;
  submitting?: boolean;
  /** When true, hide cancel and block dismiss (login gate). */
  mandatory?: boolean;
  onHide: () => void;
  onConfirm: () => void;
};

function formatEffectiveDate(value: string): string {
  return value.length >= 10 ? value.slice(0, 10) : value;
}

export function PolicyAckModal({
  policy,
  visible,
  submitting = false,
  mandatory = false,
  onHide,
  onConfirm,
}: PolicyAckModalProps) {
  const t = useTranslations('Policies');
  const [accepted, setAccepted] = useState(false);

  const body = useMemo(
    () => (policy ? resolvePolicyBody(policy) : null),
    [policy],
  );

  useEffect(() => {
    if (visible) {
      setAccepted(false);
    }
  }, [visible, policy?.policyVersionId]);

  return (
    <Dialog
      header={policy?.policyTitle ?? t('ack_title')}
      visible={visible}
      onHide={mandatory ? () => undefined : onHide}
      className="w-full max-w-2xl"
      modal
      dismissableMask={!submitting && !mandatory}
      closable={!submitting && !mandatory}
    >
      {policy && body && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <FileText className="mt-0.5 size-5 shrink-0 text-gray-500" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{policy.policyTitle}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {t('version_label', { version: policy.version })}
                {' · '}
                {t('effective_from', { date: formatEffectiveDate(policy.effectiveFrom) })}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">
              {t('content_body')}
            </p>
            {body.html
              ? (
                  <div
                    className="policy-ack-body max-h-72 overflow-y-auto rounded-md border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-800 [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_p]:mb-2 [&_ul]:mb-2"
                    dangerouslySetInnerHTML={{ __html: body.html }}
                  />
                )
              : (
                  <div className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-500">
                    {body.summary ?? t('empty_body')}
                  </div>
                )}
          </div>

          {body.summary && body.html && (
            <div>
              <p className="mb-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                {t('content_summary')}
              </p>
              <p className="rounded-md border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600 whitespace-pre-wrap">
                {body.summary}
              </p>
            </div>
          )}

          {body.blobUrl && (
            <a
              href={body.blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 underline underline-offset-2 hover:text-gray-700"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              {t('open_document')}
            </a>
          )}

          <label className="flex cursor-pointer items-start gap-2.5">
            <Checkbox
              inputId="policy-ack-confirm"
              checked={accepted}
              onChange={e => setAccepted(Boolean(e.checked))}
              disabled={submitting}
            />
            <span className="text-sm text-gray-700">{t('ack_checkbox')}</span>
          </label>

          <div className="flex justify-end gap-2 pt-1">
            {!mandatory && (
              <Button
                type="button"
                severity="secondary"
                outlined
                onClick={onHide}
                disabled={submitting}
              >
                {t('cancel')}
              </Button>
            )}
            <Button
              type="button"
              onClick={onConfirm}
              disabled={!accepted || submitting}
              loading={submitting}
            >
              {t('acknowledge')}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
