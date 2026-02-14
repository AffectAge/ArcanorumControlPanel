import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type LegacyTooltipState = {
  text: string;
  side: 'top' | 'bottom';
  group: HTMLElement;
};

const isLegacyTooltip = (element: Element): element is HTMLSpanElement => {
  if (!(element instanceof HTMLSpanElement)) return false;
  const className = element.className;
  return (
    typeof className === 'string' &&
    className.includes('pointer-events-none') &&
    className.includes('absolute') &&
    className.includes('group-hover:opacity-100')
  );
};

const extractText = (element: HTMLElement) =>
  (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();

export default function LegacyTooltipBridge() {
  const [state, setState] = useState<LegacyTooltipState | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const hideLegacyTooltips = () => {
      const spans = document.querySelectorAll('span');
      spans.forEach((span) => {
        if (!isLegacyTooltip(span)) return;
        const htmlSpan = span as HTMLSpanElement;
        htmlSpan.style.display = 'none';
      });
    };

    hideLegacyTooltips();
    const observer = new MutationObserver(() => hideLegacyTooltips());
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updatePosition = () => {
      if (!state || !tooltipRef.current) return;
      const rect = state.group.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const gap = 10;
      const edge = 8;
      const top =
        state.side === 'bottom'
          ? rect.bottom + gap
          : rect.top - tooltipRect.height - gap;
      const left = rect.left + rect.width / 2 - tooltipRect.width / 2;
      const maxLeft = window.innerWidth - tooltipRect.width - edge;
      const maxTop = window.innerHeight - tooltipRect.height - edge;
      setPosition({
        left: Math.max(edge, Math.min(left, maxLeft)),
        top: Math.max(edge, Math.min(top, maxTop)),
      });
    };

    const frame = requestAnimationFrame(updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [state]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        setState(null);
        return;
      }
      const group = target.closest('.group') as HTMLElement | null;
      if (!group) {
        setState(null);
        return;
      }
      const span = Array.from(group.querySelectorAll('span')).find((entry) =>
        isLegacyTooltip(entry),
      ) as HTMLSpanElement | undefined;
      if (!span) {
        setState(null);
        return;
      }
      const text = extractText(span);
      if (!text) {
        setState(null);
        return;
      }
      const className = span.className;
      const side = className.includes('top-full') ? 'bottom' : 'top';
      setState((prev) => {
        if (prev?.group === group && prev.text === text && prev.side === side) {
          return prev;
        }
        return { group, text, side };
      });
    };

    const onLeaveDocument = () => setState(null);

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeaveDocument);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeaveDocument);
    };
  }, []);

  if (!state) return null;

  return createPortal(
    <div
      ref={tooltipRef}
      className="fixed rounded-lg border border-white/10 bg-[#0b111b] px-2.5 py-1 text-[11px] text-white/85 shadow-2xl pointer-events-none whitespace-pre-line"
      style={{ top: position.top, left: position.left, zIndex: 2147483647 }}
    >
      {state.text}
    </div>,
    document.body,
  );
}
