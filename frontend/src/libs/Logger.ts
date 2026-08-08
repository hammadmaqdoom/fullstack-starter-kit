import type { AsyncSink } from '@logtape/logtape';
import { configure, fromAsyncSink, getConsoleSink, getJsonLinesFormatter, getLogger } from '@logtape/logtape';
import { Env } from './Env';

const betterStackHost = process.env.BETTER_STACK_INGESTING_HOST;
const betterStackToken = Env.LOGTAIL_SOURCE_TOKEN;

const betterStackSink: AsyncSink = async (record) => {
  if (!betterStackHost || !betterStackToken) {
    return;
  }

  await fetch(`https://${betterStackHost}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${betterStackToken}`,
    },
    body: JSON.stringify(record),
  });
};

await configure({
  sinks: {
    console: getConsoleSink({ formatter: getJsonLinesFormatter() }),
    betterStack: fromAsyncSink(betterStackSink),
  },
  loggers: [
    { category: ['logtape', 'meta'], sinks: ['console'], lowestLevel: 'warning' },
    {
      category: ['app'],
      sinks: betterStackHost && betterStackToken
        ? ['console', 'betterStack']
        : ['console'],
      lowestLevel: 'debug',
    },
  ],
});

export const logger = getLogger(['app']);
