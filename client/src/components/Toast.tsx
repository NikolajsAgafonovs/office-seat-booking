// Toast (ui.md Layout 6, R-12): a single role="status" element, bottom centre, auto-hides.
import { useEffect } from 'react';
import { TOAST_MS } from '../config';
import { useStore } from '../store';

export function Toast() {
  const toast = useStore((s) => s.toast);
  const hideToast = useStore((s) => s.hideToast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(hideToast, TOAST_MS);
    return () => clearTimeout(t);
  }, [toast, hideToast]);
  return (
    <div className="toast" role="status" hidden={!toast} data-testid="toast">
      {toast?.text}
    </div>
  );
}
