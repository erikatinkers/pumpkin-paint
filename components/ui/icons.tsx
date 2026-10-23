import type { ReactNode } from "react";

/** Loose pen strokes in the ink color. Decorative: the button's label names it. */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export const PaintIcon = () => (
  <Icon>
    <path d="M12 3.8c3.4 4 5.8 6.9 5.8 9.8a5.8 5.8 0 0 1-11.6 0c0-2.9 2.4-5.8 5.8-9.8z" />
  </Icon>
);

/** An eyedropper: rubber bulb, collar and glass tube, standing up and then tilted so the tip points down-left. */
export const PickIcon = () => (
  <Icon>
    <g transform="translate(0 1.4) rotate(45 12 10.4)">
      <path d="M9.6 5.8V3a2.4 2.4 0 0 1 4.8 0v2.8z" />
      <path d="M8.2 7.4h7.6" />
      <path d="M10 7.4v9.2l2 3.9 2-3.9V7.4" />
      <path d="M10 13h4" />
    </g>
  </Icon>
);

export const EraseIcon = () => (
  <Icon>
    <path d="M9.4 19.6H20" />
    <path d="M13.2 5.2l6.2 6.2a1.8 1.8 0 0 1 0 2.5l-5.7 5.7H9.4L4.6 14.8a1.8 1.8 0 0 1 0-2.5l6.1-6.1a1.8 1.8 0 0 1 2.5 0z" />
    <path d="M8.2 9.6l6.6 6.6" />
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

export const CameraIcon = () => (
  <Icon>
    <path d="M4.2 8.4h3.4l1.5-2.4h5.8l1.5 2.4h3.4v10.2H4.2z" />
    <circle cx="12" cy="13.3" r="3.3" />
  </Icon>
);

export const SparkleIcon = () => (
  <Icon>
    <path d="M10.4 4.6c.6 3.6 1.9 5 5.5 5.6-3.6.6-4.9 2-5.5 5.6-.6-3.6-1.9-5-5.5-5.6 3.6-.6 4.9-2 5.5-5.6z" />
    <path d="M17.6 14.4c.3 1.8 1 2.5 2.8 2.8-1.8.3-2.5 1-2.8 2.8-.3-1.8-1-2.5-2.8-2.8 1.8-.3 2.5-1 2.8-2.8z" />
  </Icon>
);
