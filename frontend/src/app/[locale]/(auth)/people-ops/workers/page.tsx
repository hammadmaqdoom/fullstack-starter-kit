'use client';

import type { Worker } from '@/libs/api/workers';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { useState } from 'react';
import { WorkerForm } from '@/components/workers/WorkerForm';
import { WorkerList } from '@/components/workers/WorkerList';

export default function PeopleOpsWorkersPage() {
  const t = useTranslations('Workers');
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [listKey, setListKey] = useState(0);

  const handleCreated = (worker: Worker) => {
    setCreateOpen(false);
    setListKey(k => k + 1);
    router.push(`/people-ops/workers/${worker.id}`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <Button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="gap-2"
        >
          <Plus className="size-4" aria-hidden />
          {t('add_worker')}
        </Button>
      </div>

      <WorkerList key={listKey} />

      <Dialog
        header={t('create_title')}
        visible={createOpen}
        onHide={() => setCreateOpen(false)}
        className="w-full max-w-2xl"
        modal
        dismissableMask
      >
        <WorkerForm onSuccess={handleCreated} />
      </Dialog>
    </div>
  );
}
