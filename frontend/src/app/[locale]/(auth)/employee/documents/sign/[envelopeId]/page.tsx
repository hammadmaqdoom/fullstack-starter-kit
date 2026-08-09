'use client';

import type { EsignEnvelope } from '@/libs/api/esign';
import type { TrackerStep } from '@/components/shared/StatusTracker';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusTracker } from '@/components/shared/StatusTracker';
import { OfflineBanner, useOnlineStatus } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import { getEnvelope, signEnvelope } from '@/libs/api/esign';
import { Link, useRouter } from '@/libs/I18nNavigation';
import {
  ArrowLeft,
  CheckCircle2,
  Eraser,
  FileSignature,
  PenLine,
  RefreshCw,
  Type,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { SelectButton } from 'primereact/selectbutton';
import { Skeleton } from 'primereact/skeleton';
import { Toast } from 'primereact/toast';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

type SignMethod = 'draw' | 'type';

function signTrackerSteps(
  t: ReturnType<typeof useTranslations<'Documents'>>,
  signed: boolean,
): TrackerStep[] {
  return [
    { label: t('tracker_sent'), state: 'done' },
    {
      label: t('tracker_you_sign'),
      state: signed ? 'done' : 'current',
      actor: t('tracker_you'),
    },
    { label: t('tracker_completed'), state: signed ? 'done' : 'todo' },
  ];
}

export default function EmployeeSignDocumentPage() {
  const t = useTranslations('Documents');
  const params = useParams<{ envelopeId: string }>();
  const envelopeId = params.envelopeId;
  const router = useRouter();
  const toast = useRef<Toast>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const isOnline = useOnlineStatus();

  const [envelope, setEnvelope] = useState<EsignEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<SignMethod>('draw');
  const [typedName, setTypedName] = useState('');
  const [hasDrawing, setHasDrawing] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);

  const methodOptions = [
    { label: t('method_draw'), value: 'draw' as const, icon: PenLine },
    { label: t('method_type'), value: 'type' as const, icon: Type },
  ];

  const load = useCallback(async () => {
    if (!envelopeId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await getEnvelope(envelopeId);
      setEnvelope(data);
      setSigned(data.status === 'completed');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load_envelope'));
      setEnvelope(null);
    } finally {
      setLoading(false);
    }
  }, [envelopeId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || method !== 'draw') {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    setHasDrawing(false);
  }, [method, envelope?.id]);

  const pointerPos = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) {
      return;
    }
    drawing.current = true;
    canvas?.setPointerCapture(event.pointerId);
    const { x, y } = pointerPos(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) {
      return;
    }
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) {
      return;
    }
    const { x, y } = pointerPos(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawing(true);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    drawing.current = false;
    canvasRef.current?.releasePointerCapture(event.pointerId);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    setHasDrawing(false);
  };

  const canSubmit
    = consent
      && !submitting
      && isOnline
      && ((method === 'draw' && hasDrawing) || (method === 'type' && typedName.trim().length >= 2));

  const handleSubmit = async () => {
    if (!envelopeId || !canSubmit) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload
        = method === 'draw'
          ? {
              method: 'draw' as const,
              signatureDataUrl: canvasRef.current?.toDataURL('image/png'),
            }
          : {
              method: 'type' as const,
              typedName: typedName.trim(),
            };

      await signEnvelope(envelopeId, payload);
      setSigned(true);
      toast.current?.show({
        severity: 'success',
        summary: t('sign_success'),
        life: 3000,
      });
      setTimeout(() => {
        router.push('/employee/documents');
      }, 1200);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_sign'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Toast ref={toast} />
      <OfflineBanner />

      <div className="flex items-center gap-3">
        <Link
          href="/employee/documents"
          className="inline-flex rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          aria-label={t('back_to_documents')}
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('sign_title')}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{t('sign_subtitle')}</p>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          <Skeleton height="2rem" className="w-2/3" />
          <Skeleton height="10rem" />
          <Skeleton height="8rem" />
        </div>
      )}

      {!loading && error && !envelope && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <Button type="button" className="mt-4 gap-2" onClick={() => void load()}>
            <RefreshCw className="size-4" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      )}

      {!loading && !error && !envelope && (
        <EmptyState
          icon={FileSignature}
          title={t('envelope_not_found_title')}
          description={t('envelope_not_found_description')}
          actionLabel={t('back_to_documents')}
          onAction={() => router.push('/employee/documents')}
        />
      )}

      {!loading && envelope && (
        <div className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">{envelope.title}</h2>
            <div className="mt-3">
              <StatusTracker
                steps={signTrackerSteps(t, signed || envelope.status === 'completed')}
                nextStepText={
                  signed || envelope.status === 'completed'
                    ? t('tracker_next_done')
                    : t('tracker_next_sign')
                }
              />
            </div>
          </div>

          {signed || envelope.status === 'completed' ? (
            <Message
              severity="success"
              className="w-full justify-start"
              content={(
                <span className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                  {t('already_signed')}
                </span>
              )}
            />
          ) : (
            <>
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                  {t('sign_method')}
                </p>
                <SelectButton
                  value={method}
                  onChange={e => setMethod(e.value as SignMethod)}
                  options={methodOptions}
                  optionLabel="label"
                  optionValue="value"
                  className="w-full"
                  itemTemplate={(option: { label: string; value: SignMethod; icon: typeof PenLine }) => {
                    const Icon = option.icon;
                    return (
                      <span className="inline-flex items-center gap-1.5 px-1">
                        <Icon className="size-3.5" aria-hidden />
                        {option.label}
                      </span>
                    );
                  }}
                />
              </div>

              {method === 'draw' ? (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-800">{t('draw_label')}</p>
                    <Button
                      type="button"
                      text
                      severity="secondary"
                      className="gap-1.5 !px-2 !py-1 text-xs"
                      onClick={clearCanvas}
                    >
                      <Eraser className="size-3.5" aria-hidden />
                      {t('clear')}
                    </Button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    className="h-40 w-full touch-none rounded-lg border border-gray-300 bg-white"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerUp}
                    aria-label={t('draw_label')}
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="typed-signature" className="mb-2 block text-sm font-medium text-gray-800">
                    {t('type_label')}
                  </label>
                  <InputText
                    id="typed-signature"
                    value={typedName}
                    onChange={e => setTypedName(e.target.value)}
                    className="w-full"
                    placeholder={t('type_placeholder')}
                    autoComplete="name"
                  />
                  {typedName.trim() && (
                    <p
                      className="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-2xl text-gray-800"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      {typedName.trim()}
                    </p>
                  )}
                </div>
              )}

              <label className="flex cursor-pointer items-start gap-2.5">
                <Checkbox
                  inputId="esign-consent"
                  checked={consent}
                  onChange={e => setConsent(Boolean(e.checked))}
                  disabled={submitting}
                />
                <span className="text-sm text-gray-700">{t('consent')}</span>
              </label>

              {error && (
                <Message severity="error" className="w-full justify-start" text={error} />
              )}

              {!isOnline && (
                <Message severity="warn" className="w-full justify-start" text={t('sign_offline')} />
              )}

              <Button
                type="button"
                className="w-full gap-2 sm:w-auto"
                disabled={!canSubmit}
                loading={submitting}
                onClick={() => void handleSubmit()}
              >
                <PenLine className="size-4" aria-hidden />
                {t('submit_signature')}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
