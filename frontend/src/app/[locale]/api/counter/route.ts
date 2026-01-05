import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import * as z from 'zod';
import { Env } from '@/libs/Env';
import { logger } from '@/libs/Logger';
import { CounterValidation } from '@/validations/CounterValidation';

export const PUT = async (request: Request) => {
  const json = await request.json();
  const parse = CounterValidation.safeParse(json);

  if (!parse.success) {
    return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
  }

  // `x-e2e-random-id` is used for end-to-end testing to make isolated requests
  // The default value is 0 when there is no `x-e2e-random-id` header
  const id = Number((await headers()).get('x-e2e-random-id')) || 0;

  try {
    // Forward the request to backend API
    const response = await fetch(`${Env.NEXT_PUBLIC_BACKEND_URL}/api/counter/${id}/increment`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ increment: parse.data.increment }),
    });

    if (!response.ok) {
      throw new Error('Failed to increment counter');
    }

    const data = await response.json();
    logger.info('Counter has been incremented via backend');

    return NextResponse.json({
      count: data.count,
    });
  } catch (error) {
    logger.error('Failed to increment counter', error);
    return NextResponse.json(
      { error: 'Failed to increment counter' },
      { status: 500 }
    );
  }
};
