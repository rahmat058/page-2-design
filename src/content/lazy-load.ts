import type { ScanRuntime } from './scan-context';
import { yieldToMain } from './scan-context';

export interface LazyLoadResult {
  attempted: boolean;
  truncated: boolean;
  reason: string | null;
  finalScrollHeight: number;
}

export async function loadLazyContent(
  runtime: ScanRuntime,
  onTick?: (message: string) => void,
): Promise<LazyLoadResult> {
  const { maxScanHeight, maxLazyLoadMs } = runtime.options;
  const startY = window.scrollY;
  const startX = window.scrollX;
  const started = Date.now();
  let lastHeight = document.documentElement.scrollHeight;
  let stagnant = 0;
  let truncated = false;
  let reason: string | null = null;

  const maxY = Math.min(document.documentElement.scrollHeight, maxScanHeight);
  let y = 0;
  const step = Math.max(window.innerHeight * 0.8, 400);

  while (y < maxY) {
    if (runtime.cancelled) {
      window.scrollTo(startX, startY);
      return {
        attempted: true,
        truncated: true,
        reason: 'cancelled',
        finalScrollHeight: lastHeight,
      };
    }
    if (Date.now() - started > maxLazyLoadMs) {
      truncated = true;
      reason = 'Reached the lazy-load time limit.';
      break;
    }
    window.scrollTo(0, y);
    onTick?.(`Loading lazy content at ${Math.round(y)}px`);
    await waitFrames(2);
    const nextHeight = document.documentElement.scrollHeight;
    if (nextHeight > maxScanHeight) {
      truncated = true;
      reason = 'Reached the maximum scan height.';
      lastHeight = nextHeight;
      break;
    }
    if (nextHeight > lastHeight + 20) {
      lastHeight = nextHeight;
      stagnant = 0;
    } else {
      stagnant += 1;
    }
    if (stagnant >= 4 && y + window.innerHeight >= nextHeight - 8) {
      break;
    }
    if (stagnant >= 8 && nextHeight > window.innerHeight * 3) {
      truncated = true;
      reason = 'Stopped after likely infinite-scroll growth.';
      runtime.addLimitation('INFINITE_SCROLL', reason);
      break;
    }
    y += step;
  }

  if (typeof document.fonts?.ready !== 'undefined') {
    await Promise.race([document.fonts.ready, delay(1500)]);
  }
  await delay(200);
  window.scrollTo(startX, startY);
  await waitFrames(1);

  return {
    attempted: true,
    truncated,
    reason,
    finalScrollHeight: document.documentElement.scrollHeight,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFrames(count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await yieldToMain();
  }
}
