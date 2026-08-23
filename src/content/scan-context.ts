import type { ScanLimitation, ScanOptions } from '../shared/types';

export interface ScanRuntime {
  options: ScanOptions;
  cancelled: boolean;
  limitations: ScanLimitation[];
  nextElementId: number;
  addLimitation(code: string, message: string, severity?: ScanLimitation['severity']): void;
}

export function createRuntime(options: ScanOptions): ScanRuntime {
  const limitations: ScanLimitation[] = [];
  return {
    options,
    cancelled: false,
    limitations,
    nextElementId: 1,
    addLimitation(code, message, severity = 'warning') {
      if (!limitations.some((item) => item.code === code && item.message === message)) {
        limitations.push({ code, message, severity });
      }
    },
  };
}

export function idFor(runtime: ScanRuntime, prefix = 'el'): string {
  const id = `${prefix}_${runtime.nextElementId}`;
  runtime.nextElementId += 1;
  return id;
}

export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });
}
