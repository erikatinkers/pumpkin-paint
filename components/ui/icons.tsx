import type { ReactNode } from "react";

/** Thick rounded strokes, like a coil of clay pressed into the key. Decorative: the button's label names it. */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export const PaintIcon = () => (
  <Icon>
    <path d="M12 3.8c3.4 4 5.8 6.9 5.8 9.8a5.8 5.8 0 0 1-11.6 0c0-2.9 2.4-5.8 5.8-9.8z" />
  </Icon>
);

export const TurnIcon = () => (
  <Icon>
    <path d="M19.2 12.2a7.2 7.2 0 1 1-2.3-5.3" />
    <path d="M19.4 4.6v4.4h-4.4" />
  </Icon>
);

export const UndoIcon = () => (
  <Icon>
    <path d="M8.6 5.8 4.2 10.2l4.4 4.4" />
    <path d="M4.6 10.2h9.2a5.4 5.4 0 0 1 0 10.8h-3.4" />
  </Icon>
);

export const RedoIcon = () => (
  <Icon>
    <path d="M15.4 5.8l4.4 4.4-4.4 4.4" />
    <path d="M19.4 10.2h-9.2a5.4 5.4 0 0 0 0 10.8h3.4" />
  </Icon>
);

export const ClearIcon = () => (
  <Icon>
    <path d="M4.6 7.4h14.8" />
    <path d="M9.6 7.4V4.6h4.8v2.8" />
    <path d="M6.8 7.4 7.9 19.2h8.2l1.1-11.8" />
  </Icon>
);
