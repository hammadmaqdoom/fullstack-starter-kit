'use client';

import type { PendingPolicyAcknowledgement } from '@/libs/api/policies';
import { FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { useEffect, useState } from 'react';

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

function summaryText(policy: PendingPolicyAcknowledgement): string {
  if (policy.contentSummary?.trim()) {
    return policy.contentSummary.trim();
  }
  if (policy.contentHtml) {
    const plain = policy.contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (plain.length > 400) {
      return `${plain.slice(0, 400)}…`;
    }
    return plain || '—';
  }
  return '—';
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
      className="w-full max-w-lg"
      modal
      dismissableMask={!submitting && !mandatory}
      closable={!submitting && !mandatory}
    >
      {policy && (
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
              {t('content_summary')}
            </p>
            <div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white p-3 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
              {summaryText(policy)}
            </div>
          </div>

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
