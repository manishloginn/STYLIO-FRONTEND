import { useSyncExternalStore } from 'react';
import { isApiBusy, subscribeApiBusy } from '../../services/api';

export function GlobalLoader() {
  const busy = useSyncExternalStore(subscribeApiBusy, isApiBusy, () => false);
  if (!busy) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-white/70" role="status" aria-live="polite" aria-label="Saving">
      <div className="h-11 w-11 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
    </div>
  );
}
