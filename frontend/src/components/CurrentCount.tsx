import { getTranslations } from 'next-intl/server';
import { headers } from 'next/headers';
import { Env } from '@/libs/Env';
import { logger } from '@/libs/Logger';

export const CurrentCount = async () => {
  const t = await getTranslations('CurrentCount');

  // `x-e2e-random-id` is used for end-to-end testing to make isolated requests
  // The default value is 0 when there is no `x-e2e-random-id` header
  const id = Number((await headers()).get('x-e2e-random-id')) || 0;
  
  try {
    // Fetch counter from backend API
    const response = await fetch(`${Env.NEXT_PUBLIC_BACKEND_URL}/api/counter/${id}`, {
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch counter');
    }

    const data = await response.json();
    const count = data?.count ?? 0;

    logger.info('Counter fetched successfully from backend');

    return (
      <div>
        {t('count', { count })}
      </div>
    );
  } catch (error) {
    logger.error('Failed to fetch counter from backend', error);
    // Return 0 as fallback
    return (
      <div>
        {t('count', { count: 0 })}
      </div>
    );
  }
};
