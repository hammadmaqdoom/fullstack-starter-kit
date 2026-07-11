'use client';

import type { TrackerStep } from '@/components/shared/StatusTracker';
import type { TravelRequest, TravelRequestStatus } from '@/libs/api/travel';
import { AlertCircle, ArrowLeft, Plus, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useState } from 'react';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { StatusTracker } from '@/components/shared/StatusTracker';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import {
  addTravelItinerary,
  getTravelRequest,
  markTravelCompleted,
  markTravelInProgress,
  submitTravelRequest,
} from '@/libs/api/travel';
import { useRouter } from '@/libs/I18nNavigation';

const STATUS_SEVERITY: Record<TravelRequestStatus, 'secondary' | 'info' | 'warning' | 'success' | 'danger'> = {
  draft: 'secondary',
  submitted: 'info',
  approved: 'warning',
  in_progress: 'warning',
  completed: 'success',
  reconciled: 'success',
  rejected: 'danger',
};

function requestTrackerSteps(
  request: TravelRequest,
  t: ReturnType<typeof useTranslations<'EmployeeTravel'>>,
): TrackerStep[] {
  if (request.status === 'rejected') {
    return [
      { label: t('tracker_submitted'), state: 'done' },
      { label: t('tracker_rejected'), state: 'current' },
    ];
  }
  const order = ['draft', 'submitted', 'approved', 'in_progress', 'completed', 'reconciled'];
  const currentIndex = order.indexOf(request.status);
  const labels = [
    t('tracker_draft'),
    t('tracker_submitted'),
    t('tracker_approved'),
    t('tracker_in_progress'),
    t('tracker_completed'),
    t('tracker_reconciled'),
  ];
  return labels.map((label, index) => ({
    label,
    state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo',
  }));
}

function toIsoDateTime(date: Date | null): string | undefined {
  if (!date) {
    return undefined;
  }
  return date.toISOString();
}

export default function EmployeeTravelDetailPage() {
  const t = useTranslations('EmployeeTravel');
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const requestId = params.id;

  const [request, setRequest] = useState<TravelRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState<'submit' | 'in_progress' | 'completed' | null>(null);

  const [itineraryDialogOpen, setItineraryDialogOpen] = useState(false);
  const [itineraryError, setItineraryError] = useState<string | null>(null);
  const [isSavingItinerary, setIsSavingItinerary] = useState(false);
  const [legType, setLegType] = useState('flight');
  const [legDescription, setLegDescription] = useState('');
  const [departureAt, setDepartureAt] = useState<Date | null>(null);
  const [arrivalAt, setArrivalAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await getTravelRequest(requestId);
      setRequest(data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setRequest(null);
    } finally {
      setIsLoading(false);
    }
  }, [requestId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async () => {
    if (!request) {
      return;
    }
    setActionError(null);
    setIsActing('submit');
    try {
      await submitTravelRequest(request.id);
      await load();
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t('error_submit'));
    } finally {
      setIsActing(null);
    }
  };

  const handleMarkInProgress = async () => {
    if (!request) {
      return;
    }
    setActionError(null);
    setIsActing('in_progress');
    try {
      await markTravelInProgress(request.id);
      await load();
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t('error_action'));
    } finally {
      setIsActing(null);
    }
  };

  const handleMarkCompleted = async () => {
    if (!request) {
      return;
    }
    setActionError(null);
    setIsActing('completed');
    try {
      await markTravelCompleted(request.id);
      await load();
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : t('error_action'));
    } finally {
      setIsActing(null);
    }
  };

  const openItineraryDialog = () => {
    setItineraryError(null);
    setLegType('flight');
    setLegDescription('');
    setDepartureAt(null);
    setArrivalAt(null);
    setItineraryDialogOpen(true);
  };

  const handleAddItinerary = async () => {
    if (!request) {
      return;
    }
    if (!legDescription.trim()) {
      setItineraryError(t('error_itinerary_description_required'));
      return;
    }
    setItineraryError(null);
    setIsSavingItinerary(true);
    try {
      await addTravelItinerary(request.id, {
        legType: legType.trim(),
        description: legDescription.trim(),
        departureAt: toIsoDateTime(departureAt),
        arrivalAt: toIsoDateTime(arrivalAt),
      });
      setItineraryDialogOpen(false);
      await load();
    } catch (err) {
      setItineraryError(err instanceof ApiRequestError ? err.message : t('error_itinerary_add'));
    } finally {
      setIsSavingItinerary(false);
    }
  };

  if (isLoading && !request && !error) {
    return (
      <>
        <OfflineBanner />
        <PageSkeleton variant="detail" rows={4} />
      </>
    );
  }

  if (!isLoading && (error || !request)) {
    return (
      <>
        <OfflineBanner />
        <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error ?? t('error_not_found')}
          </div>
          <Button type="button" severity="secondary" size="small" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      </>
    );
  }

  if (!request) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-16 lg:pb-0">
      <OfflineBanner />

      <button
        type="button"
        onClick={() => router.push('/employee/travel')}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t('back_to_requests')}
      </button>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">{request.destinations.join(', ')}</h1>
              <Tag value={t(`status_${request.status}`)} severity={STATUS_SEVERITY[request.status]} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {t('request_dates', { startDate: request.startDate, endDate: request.endDate })}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {t('request_cost', { amount: request.estimatedCost, currency: request.currencyCode })}
            </p>
          </div>
        </div>

        {request.status === 'rejected' && request.rejectionReason && (
          <Message severity="error" className="mt-4 w-full" text={request.rejectionReason} />
        )}

        <div className="mt-5 border-t border-gray-100 pt-4">
          <StatusTracker steps={requestTrackerSteps(request, t)} />
        </div>

        <div className="mt-5 border-t border-gray-100 pt-4">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">{t('field_purpose')}</h2>
          <p className="text-sm text-gray-600">{request.purpose}</p>
        </div>

        {actionError && <Message severity="error" className="mt-4 w-full" text={actionError} />}

        {request.status === 'draft' && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <Button
              type="button"
              className="gap-2"
              onClick={() => void handleSubmit()}
              loading={isActing === 'submit'}
            >
              {t('submit_for_approval')}
            </Button>
          </div>
        )}

        {request.status === 'approved' && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <Button
              type="button"
              className="gap-2"
              onClick={() => void handleMarkInProgress()}
              loading={isActing === 'in_progress'}
            >
              {t('mark_in_progress')}
            </Button>
          </div>
        )}

        {(request.status === 'approved' || request.status === 'in_progress') && (
          <div className="mt-3 border-t border-gray-100 pt-4">
            <Button
              type="button"
              severity="secondary"
              outlined
              className="gap-2"
              onClick={() => void handleMarkCompleted()}
              loading={isActing === 'completed'}
            >
              {t('mark_completed')}
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-900">{t('itineraries_title')}</h2>
          <Button
            type="button"
            severity="secondary"
            outlined
            size="small"
            className="gap-1.5"
            onClick={openItineraryDialog}
          >
            <Plus className="size-3.5" aria-hidden />
            {t('add_itinerary')}
          </Button>
        </div>

        {(!request.itineraries || request.itineraries.length === 0) && (
          <p className="mt-3 text-sm text-gray-500">{t('itineraries_empty')}</p>
        )}

        {request.itineraries && request.itineraries.length > 0 && (
          <ul className="mt-3 space-y-2">
            {request.itineraries.map((leg, index) => (
              <li key={leg.id ?? index} className="rounded-lg border border-gray-200 p-3 text-sm">
                <p className="font-medium text-gray-900">{leg.description}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {leg.legType}
                  {leg.departureAt && ` · ${leg.departureAt}`}
                  {leg.arrivalAt && ` – ${leg.arrivalAt}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        header={t('add_itinerary')}
        visible={itineraryDialogOpen}
        onHide={() => setItineraryDialogOpen(false)}
        className="w-full max-w-md"
        modal
        dismissableMask
      >
        <div className="space-y-4 pt-1">
          {itineraryError && <Message severity="error" text={itineraryError} className="w-full" />}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="leg-type" className="text-sm font-medium text-gray-700">
              {t('field_leg_type')}
            </label>
            <InputText
              id="leg-type"
              value={legType}
              onChange={e => setLegType(e.target.value)}
              className="w-full"
              placeholder={t('field_leg_type_placeholder')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="leg-description" className="text-sm font-medium text-gray-700">
              {t('field_leg_description')}
            </label>
            <InputTextarea
              id="leg-description"
              value={legDescription}
              onChange={e => setLegDescription(e.target.value)}
              rows={2}
              className="w-full"
              placeholder={t('field_leg_description_placeholder')}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="leg-departure" className="text-sm font-medium text-gray-700">
                {t('field_departure')}
              </label>
              <Calendar
                inputId="leg-departure"
                value={departureAt}
                onChange={e => setDepartureAt(e.value as Date | null)}
                showTime
                dateFormat="yy-mm-dd"
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="leg-arrival" className="text-sm font-medium text-gray-700">
                {t('field_arrival')}
              </label>
              <Calendar
                inputId="leg-arrival"
                value={arrivalAt}
                onChange={e => setArrivalAt(e.value as Date | null)}
                showTime
                dateFormat="yy-mm-dd"
                className="w-full"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              severity="secondary"
              label={t('cancel')}
              onClick={() => setItineraryDialogOpen(false)}
              disabled={isSavingItinerary}
            />
            <Button
              type="button"
              label={isSavingItinerary ? t('saving') : t('save')}
              onClick={() => void handleAddItinerary()}
              loading={isSavingItinerary}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
