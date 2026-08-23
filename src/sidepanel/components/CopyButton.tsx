import type { ReactNode } from 'react';

interface Props {
  value: string;
  label: string;
}

export function CopyButton({ value, label }: Props) {
  return (
    <button
      type="button"
      className="copy"
      onClick={() => void navigator.clipboard.writeText(value)}
    >
      {label}
    </button>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
