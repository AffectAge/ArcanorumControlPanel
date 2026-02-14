import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type TooltipProps = {
  label: string;
  description?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactNode;
};

const sideClassName: Record<NonNullable<TooltipProps['side']>, string> = {
  top: '',
  bottom: '',
  left: '',
  right: '',
};

export default function Tooltip({
  label,
  description,
  side = 'top',
  children,
}: TooltipProps) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const anchor = anchorRef.current;
      const tooltip = tooltipRef.current;
      if (!anchor || !tooltip) return;
      const anchorRect = anchor.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const gap = 10;
      const edgePadding = 8;

      let top = 0;
      let left = 0;

      if (side === 'bottom') {
        top = anchorRect.bottom + gap;
        left = anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2;
      } else if (side === 'left') {
        top = anchorRect.top + anchorRect.height / 2 - tooltipRect.height / 2;
        left = anchorRect.left - tooltipRect.width - gap;
      } else if (side === 'right') {
        top = anchorRect.top + anchorRect.height / 2 - tooltipRect.height / 2;
        left = anchorRect.right + gap;
      } else {
        top = anchorRect.top - tooltipRect.height - gap;
        left = anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2;
      }

      const maxLeft = window.innerWidth - tooltipRect.width - edgePadding;
      const maxTop = window.innerHeight - tooltipRect.height - edgePadding;
      setPosition({
        left: Math.max(edgePadding, Math.min(left, maxLeft)),
        top: Math.max(edgePadding, Math.min(top, maxTop)),
      });
    };

    const frame = requestAnimationFrame(updatePosition);
    const handleWindowUpdate = () => updatePosition();
    window.addEventListener('scroll', handleWindowUpdate, true);
    window.addEventListener('resize', handleWindowUpdate);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', handleWindowUpdate, true);
      window.removeEventListener('resize', handleWindowUpdate);
    };
  }, [open, side]);

  return (
    <div
      ref={anchorRef}
      className="inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      {children}
      {open &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className={`fixed w-max max-w-64 px-2.5 py-1.5 rounded-lg border border-white/10 bg-[#0b111b] text-white shadow-2xl pointer-events-none ${sideClassName[side]}`}
            style={{
              top: position.top,
              left: position.left,
              zIndex: 2147483647,
            }}
          >
            <div className="text-[11px] font-semibold leading-tight">{label}</div>
            {description ? (
              <div className="text-[10px] text-white/70 leading-tight mt-1">
                {description}
              </div>
            ) : null}
          </div>,
          document.body,
        )}
    </div>
  );
}
