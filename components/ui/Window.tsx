import type { ReactNode } from "react";

/** A hand-inked window: a title bar with a made-up address and, optionally, a close button, over a body for the controls. */
export default function Window({ title, className, label, onClose, children }: { title: string; className: string; label: string; onClose?: () => void; children: ReactNode }) {
  return (
    <aside className={`float ${className}`} data-floating aria-label={label}>
      <div className="titlebar">
        <span aria-hidden="true">{title}</span>
        {onClose && <button type="button" className="wb wb-close" aria-label={`Close ${label}`} onClick={onClose} />}
      </div>
      <div className="window-body">{children}</div>
    </aside>
  );
}
