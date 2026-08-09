'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ApiRequestError } from '@/libs/api/client';
import { listCountries } from '@/libs/api/country-config';
import type { HolidayCalendar, LeaveType } from '@/libs/api/leave';
import {
  createHoliday,
  createHolidayCalendar,
  createLeaveType,
  listAdminLeaveTypes,
  listHolidayCalendars,
  updateLeaveType,
} from '@/libs/api/leave';
import { CalendarDays, Plus, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';
import { TabPanel, TabView } from 'primereact/tabview';
import { Tag } from 'primereact/tag';
import { useCallback, useEffect, useMemo, useState } from 'react';

const ACCRUAL_OPTIONS = [
  { label: 'Annual', value: 'annual' },
  { label: 'Monthly', value: 'monthly' },
];

export default function PeopleOpsLeaveAdminPage() {
  const t = useTranslations('LeaveAdmin');
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [calendars, setCalendars] = useState<HolidayCalendar[]>([]);
  const [countryOptions, setCountryOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [typeCountry, setTypeCountry] = useState('PK');
  const [typeCode, setTypeCode] = useState('');
  const [typeName, setTypeName] = useState('');
  const [typeAccrual, setTypeAccrual] = useState<'annual' | 'monthly'>('annual');
  const [typeDays, setTypeDays] = useState<number | null>(20);
  const [typeCarry, setTypeCarry] = useState<number | null>(0);
  const [savingType, setSavingType] = useState(false);
  const [typeError, setTypeError] = useState<string | null>(null);

  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const [calCountry, setCalCountry] = useState('PK');
  const [calName, setCalName] = useState('');
  const [calYear, setCalYear] = useState<number | null>(new Date().getFullYear());
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [holidayCalendarId, setHolidayCalendarId] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [holidayError, setHolidayError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [typesRes, calendarsRes, countriesRes] = await Promise.all([
        listAdminLeaveTypes(),
        listHolidayCalendars(),
        listCountries(),
      ]);
      setTypes(typesRes.data ?? []);
      setCalendars(calendarsRes.data ?? []);
      const options = (countriesRes.data ?? [])
        .filter(c => c.isActive)
        .map(c => ({
          label: c.countryCode,
          value: c.countryCode,
        }));
      setCountryOptions(options);
      const defaultCountry = options[0]?.value;
      if (defaultCountry) {
        setTypeCountry(prev => (options.some(o => o.value === prev) ? prev : defaultCountry));
        setCalCountry(prev => (options.some(o => o.value === prev) ? prev : defaultCountry));
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('error_load'));
      setTypes([]);
      setCalendars([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreateType = () => {
    setEditingType(null);
    setTypeCountry('PK');
    setTypeCode('');
    setTypeName('');
    setTypeAccrual('annual');
    setTypeDays(20);
    setTypeCarry(0);
    setTypeError(null);
    setTypeDialogOpen(true);
  };

  const openEditType = (row: LeaveType) => {
    setEditingType(row);
    setTypeCountry(row.countryCode ?? 'PK');
    setTypeCode(row.code);
    setTypeName(row.name);
    setTypeAccrual((row.accrualMethod as 'annual' | 'monthly') || 'annual');
    setTypeDays(Number(row.daysPerYear ?? 0));
    setTypeCarry(Number(row.carryForwardCap ?? 0));
    setTypeError(null);
    setTypeDialogOpen(true);
  };

  const saveType = async () => {
    setSavingType(true);
    setTypeError(null);
    try {
      const payload = {
        countryCode: typeCountry,
        code: typeCode.trim().toUpperCase(),
        name: typeName.trim(),
        accrualMethod: typeAccrual,
        daysPerYear: typeDays ?? 0,
        carryForwardCap: typeCarry ?? 0,
      };
      if (editingType) {
        await updateLeaveType(editingType.id, payload);
      } else {
        await createLeaveType(payload);
      }
      setTypeDialogOpen(false);
      await load();
    } catch (err) {
      setTypeError(
        err instanceof ApiRequestError ? err.message : t('error_save_type'),
      );
    } finally {
      setSavingType(false);
    }
  };

  const openCreateCalendar = () => {
    setCalCountry('PK');
    setCalName('');
    setCalYear(new Date().getFullYear());
    setCalendarError(null);
    setCalendarDialogOpen(true);
  };

  const saveCalendar = async () => {
    setSavingCalendar(true);
    setCalendarError(null);
    try {
      await createHolidayCalendar({
        countryCode: calCountry,
        name: calName.trim() || `${calCountry} ${calYear}`,
        effectiveYear: calYear ?? new Date().getFullYear(),
      });
      setCalendarDialogOpen(false);
      await load();
    } catch (err) {
      setCalendarError(
        err instanceof ApiRequestError ? err.message : t('error_save_calendar'),
      );
    } finally {
      setSavingCalendar(false);
    }
  };

  const openAddHoliday = (calendarId: string) => {
    setHolidayCalendarId(calendarId);
    setHolidayName('');
    setHolidayDate('');
    setHolidayError(null);
    setHolidayDialogOpen(true);
  };

  const saveHoliday = async () => {
    setSavingHoliday(true);
    setHolidayError(null);
    try {
      await createHoliday(holidayCalendarId, {
        name: holidayName.trim(),
        holidayDate,
      });
      setHolidayDialogOpen(false);
      await load();
    } catch (err) {
      setHolidayError(
        err instanceof ApiRequestError ? err.message : t('error_save_holiday'),
      );
    } finally {
      setSavingHoliday(false);
    }
  };

  const holidayRows = useMemo(
    () =>
      calendars.flatMap(cal =>
        (cal.holidays ?? []).map(h => ({
          ...h,
          calendarName: cal.name,
          countryCode: cal.countryCode,
          year: cal.effectiveYear,
          calendarId: cal.id,
        })),
      ),
    [calendars],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <OfflineBanner />

      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        action={(
          <Button
            type="button"
            severity="secondary"
            outlined
            className="gap-2"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className="size-4" aria-hidden />
            {t('refresh')}
          </Button>
        )}
      />

      {loading && (
        <div className="space-y-3">
          <Skeleton height="2.5rem" />
          <Skeleton height="10rem" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <Button type="button" className="mt-4 gap-2" onClick={() => void load()}>
            <RefreshCw className="size-4" aria-hidden />
            {t('retry')}
          </Button>
        </div>
      )}

      {!loading && !error && (
        <TabView>
          <TabPanel header={t('tab_types')}>
            <div className="mb-4 flex justify-end">
              <Button type="button" className="gap-2" onClick={openCreateType}>
                <Plus className="size-4" aria-hidden />
                {t('create_type_cta')}
              </Button>
            </div>

            {types.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title={t('empty_title')}
                description={t('empty_description')}
                actionLabel={t('create_type_cta')}
                onAction={openCreateType}
              />
            ) : (
              <DataTable
                value={types}
                size="small"
                stripedRows
                className="text-sm"
                emptyMessage={t('empty_title')}
              >
                <Column field="countryCode" header={t('col_country')} style={{ width: '6rem' }} />
                <Column field="name" header={t('col_name')} />
                <Column field="code" header={t('col_code')} style={{ width: '8rem' }} />
                <Column
                  field="accrualMethod"
                  header={t('col_accrual')}
                  style={{ width: '8rem' }}
                  body={(row: LeaveType) => (
                    <Tag
                      value={
                        row.accrualMethod === 'monthly'
                          ? t('accrual_monthly')
                          : t('accrual_annual')
                      }
                      severity="secondary"
                    />
                  )}
                />
                <Column
                  field="daysPerYear"
                  header={t('col_days')}
                  style={{ width: '7rem' }}
                />
                <Column
                  field="carryForwardCap"
                  header={t('col_carry')}
                  style={{ width: '7rem' }}
                />
                <Column
                  header=""
                  style={{ width: '6rem' }}
                  body={(row: LeaveType) => (
                    <Button
                      type="button"
                      size="small"
                      severity="secondary"
                      outlined
                      onClick={() => openEditType(row)}
                    >
                      {t('edit')}
                    </Button>
                  )}
                />
              </DataTable>
            )}
          </TabPanel>

          <TabPanel header={t('tab_calendars')}>
            <div className="mb-4 flex justify-end gap-2">
              <Button type="button" className="gap-2" onClick={openCreateCalendar}>
                <Plus className="size-4" aria-hidden />
                {t('create_calendar_cta')}
              </Button>
            </div>

            {calendars.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title={t('empty_calendars_title')}
                description={t('empty_calendars_description')}
                actionLabel={t('create_calendar_cta')}
                onAction={openCreateCalendar}
              />
            ) : (
              <div className="space-y-4">
                <DataTable
                  value={calendars}
                  size="small"
                  stripedRows
                  className="text-sm"
                >
                  <Column field="countryCode" header={t('col_country')} style={{ width: '6rem' }} />
                  <Column field="name" header={t('col_name')} />
                  <Column field="effectiveYear" header={t('col_year')} style={{ width: '6rem' }} />
                  <Column
                    header={t('col_holidays')}
                    style={{ width: '7rem' }}
                    body={(row: HolidayCalendar) => row.holidays?.length ?? 0}
                  />
                  <Column
                    header=""
                    style={{ width: '9rem' }}
                    body={(row: HolidayCalendar) => (
                      <Button
                        type="button"
                        size="small"
                        severity="secondary"
                        outlined
                        onClick={() => openAddHoliday(row.id)}
                      >
                        {t('add_holiday')}
                      </Button>
                    )}
                  />
                </DataTable>

                {holidayRows.length > 0 && (
                  <DataTable
                    value={holidayRows}
                    size="small"
                    stripedRows
                    className="text-sm"
                    header={<span className="text-sm font-medium">{t('holidays_list')}</span>}
                  >
                    <Column field="countryCode" header={t('col_country')} style={{ width: '6rem' }} />
                    <Column field="year" header={t('col_year')} style={{ width: '6rem' }} />
                    <Column field="name" header={t('col_name')} />
                    <Column field="holidayDate" header={t('col_date')} style={{ width: '8rem' }} />
                  </DataTable>
                )}
              </div>
            )}
          </TabPanel>
        </TabView>
      )}

      <Dialog
        header={editingType ? t('edit_type_title') : t('create_type_title')}
        visible={typeDialogOpen}
        onHide={() => setTypeDialogOpen(false)}
        modal
        dismissableMask
        className="w-full max-w-md"
        footer={(
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              severity="secondary"
              outlined
              onClick={() => setTypeDialogOpen(false)}
              disabled={savingType}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => void saveType()}
              loading={savingType}
              disabled={!typeCode.trim() || !typeName.trim()}
            >
              {t('save')}
            </Button>
          </div>
        )}
      >
        <div className="space-y-3">
          {typeError && <Message severity="error" text={typeError} className="w-full" />}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('field_country')}</label>
            <Dropdown
              value={typeCountry}
              options={countryOptions}
              onChange={e => setTypeCountry(e.value)}
              className="w-full"
              disabled={Boolean(editingType)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('field_code')}</label>
            <InputText
              value={typeCode}
              onChange={e => setTypeCode(e.target.value)}
              className="w-full"
              disabled={Boolean(editingType)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('field_name')}</label>
            <InputText
              value={typeName}
              onChange={e => setTypeName(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('field_accrual')}</label>
            <Dropdown
              value={typeAccrual}
              options={ACCRUAL_OPTIONS}
              onChange={e => setTypeAccrual(e.value)}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t('field_days')}</label>
              <InputNumber
                value={typeDays}
                onValueChange={e => setTypeDays(e.value ?? null)}
                className="w-full"
                min={0}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t('field_carry')}</label>
              <InputNumber
                value={typeCarry}
                onValueChange={e => setTypeCarry(e.value ?? null)}
                className="w-full"
                min={0}
              />
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        header={t('create_calendar_title')}
        visible={calendarDialogOpen}
        onHide={() => setCalendarDialogOpen(false)}
        modal
        dismissableMask
        className="w-full max-w-md"
        footer={(
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              severity="secondary"
              outlined
              onClick={() => setCalendarDialogOpen(false)}
              disabled={savingCalendar}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => void saveCalendar()}
              loading={savingCalendar}
              disabled={!calYear}
            >
              {t('save')}
            </Button>
          </div>
        )}
      >
        <div className="space-y-3">
          {calendarError && (
            <Message severity="error" text={calendarError} className="w-full" />
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('field_country')}</label>
            <Dropdown
              value={calCountry}
              options={countryOptions}
              onChange={e => setCalCountry(e.value)}
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('field_name')}</label>
            <InputText
              value={calName}
              onChange={e => setCalName(e.target.value)}
              className="w-full"
              placeholder={`${calCountry} ${calYear ?? ''}`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('field_year')}</label>
            <InputNumber
              value={calYear}
              onValueChange={e => setCalYear(e.value ?? null)}
              className="w-full"
              useGrouping={false}
              min={2020}
              max={2100}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        header={t('add_holiday_title')}
        visible={holidayDialogOpen}
        onHide={() => setHolidayDialogOpen(false)}
        modal
        dismissableMask
        className="w-full max-w-md"
        footer={(
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              severity="secondary"
              outlined
              onClick={() => setHolidayDialogOpen(false)}
              disabled={savingHoliday}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => void saveHoliday()}
              loading={savingHoliday}
              disabled={!holidayName.trim() || !holidayDate}
            >
              {t('save')}
            </Button>
          </div>
        )}
      >
        <div className="space-y-3">
          {holidayError && (
            <Message severity="error" text={holidayError} className="w-full" />
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('field_name')}</label>
            <InputText
              value={holidayName}
              onChange={e => setHolidayName(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('field_date')}</label>
            <InputText
              type="date"
              value={holidayDate}
              onChange={e => setHolidayDate(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
