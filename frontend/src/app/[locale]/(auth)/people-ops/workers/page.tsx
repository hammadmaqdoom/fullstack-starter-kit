'use client';

import type { Worker } from '@/libs/api/workers';
import { PageHeader } from '@/components/shared/PageHeader';
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
      <PageHeader
        title={t('title')}
        description={t('page_description')}
        action={(
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="gap-2"
          >
            <Plus className="size-4" aria-hidden />
            {t('add_worker')}
          </Button>
        )}
      />

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
