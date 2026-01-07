import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import './Masonry.css';

const useMedia = (queries: string[], values: number[], defaultValue: number): number => {
  const isClient = typeof window !== 'undefined';

  // Initialize with a safe default or calculate if client is immediately available
  const [value, setValue] = useState<number>(defaultValue);

  useEffect(() => {
    if (!isClient) return;

    const mediaQueryLists = queries.map(q => window.matchMedia(q));

    const getValue = () => {
      const index = mediaQueryLists.findIndex(mql => mql.matches);
      return values[index] ?? defaultValue;
    };

    // Set initial value on mount
    setValue(getValue());

    const handler = () => setValue(getValue());
    mediaQueryLists.forEach(mql => mql.addEventListener('change', handler));

    return () => mediaQueryLists.forEach(mql => mql.removeEventListener('change', handler));
  }, [queries, values, defaultValue, isClient]);

  return value;
};

const useMeasure = <T extends HTMLElement>() => {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return [ref, size] as const;
};

export interface MasonryItem {
  id: string;
  img: string;
  url: string;
  height: number;
}

interface GridItem extends MasonryItem {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface MasonryProps {
  items: MasonryItem[];
  ease?: string;
  duration?: number;
  stagger?: number;
  animateFrom?: 'bottom' | 'top' | 'left' | 'right' | 'center' | 'random';
  scaleOnHover?: boolean;
  hoverScale?: number;
  blurToFocus?: boolean;
  colorShiftOnHover?: boolean;
}

const Masonry: React.FC<MasonryProps> = ({
  items,
  ease = 'power3.out',
  duration = 0.6,
  stagger = 0.05,
  animateFrom = 'bottom',
  scaleOnHover = true,
  hoverScale = 0.95,
  blurToFocus = true,
  colorShiftOnHover = false
}) => {
  const columns = useMedia(
    ['(min-width:1500px)', '(min-width:1000px)', '(min-width:600px)', '(min-width:400px)'],
    [5, 4, 3, 2],
    1
  );

  const [containerRef, { width }] = useMeasure<HTMLDivElement>();

  // Ensure items have unique IDs
  const safeItems = useMemo(() => items.map((item, i) => ({
    ...item,
    id: item.id || `masonry-item-${i}`
  })), [items]);

  const getInitialPosition = (item: GridItem) => {
    if (typeof window === 'undefined') return { x: item.x, y: item.y };

    // Default fallback
    let startX = item.x;
    let startY = item.y + 100;

    const direction = animateFrom === 'random'
      ? ['top', 'bottom', 'left', 'right'][Math.floor(Math.random() * 4)]
      : animateFrom;

    switch (direction) {
      case 'top': startY = -200; break;
      case 'bottom': startY = window.innerHeight + 200; break;
      case 'left': startX = -200; break;
      case 'right': startX = window.innerWidth + 200; break;
      case 'center':
        startX = width / 2 - item.w / 2;
        startY = 0; // Relative to viewport usually, but here relative to container top approx
        break;
    }
    return { x: startX, y: startY };
  };

  const grid = useMemo<GridItem[]>(() => {
    if (!width) return [];

    const colHeights = new Array(columns).fill(0);
    const columnWidth = width / columns;

    return safeItems.map(child => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = columnWidth * col;
      const height = child.height / 2; // Maintaining the specific height logic from original
      const y = colHeights[col];

      colHeights[col] += height;

      return { ...child, x, y, w: columnWidth, h: height };
    });
  }, [columns, safeItems, width]);

  // Calculate container height based on the max column height
  const containerHeight = useMemo(() => {
    if (!width) return 0;
    const colHeights = new Array(columns).fill(0);

    safeItems.forEach(child => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      colHeights[col] += (child.height / 2);
    });

    return Math.max(...colHeights);
  }, [columns, safeItems, width]);

  useLayoutEffect(() => {
    if (grid.length === 0) return;

    const ctx = gsap.context(() => {
      grid.forEach((item, index) => {
        const selector = `[data-key="${item.id}"]`;

        const initialPos = getInitialPosition(item);

        // React handles the FINAL position via top/left/width/height styles.
        // GSAP animates 'from' an offset relative to that position.

        gsap.from(selector, {
          opacity: 0,
          // Calculate delta: we want to start at initialPos, end at 0 relative (which is item.x/y)
          // But wait, if we use x/y in GSAP, it translates relative to the element's position.
          // Element is at item.x, item.y via top/left.
          // So if we want it to APPEAR to be at initialPos.x, initialPos.y
          // We need translate(initialPos.x - item.x, initialPos.y - item.y)

          x: initialPos.x - item.x,
          y: initialPos.y - item.y,

          duration: duration,
          ease: ease,
          delay: index * stagger,
          // Clear transform after animation so the element returns to 'pure' top/left layout without GPU layer artifacts if desired.
          // Or keep it. Safest is to clear transform only.
          clearProps: "transform,opacity"
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, [grid, duration, ease, stagger, animateFrom, width]);

  const handleMouseEnter = (e: React.MouseEvent, item: GridItem) => {
    if (!scaleOnHover) return;
    const currentTarget = e.currentTarget as HTMLElement;
    gsap.to(currentTarget, { scale: hoverScale, zIndex: 10, duration: 0.3, ease: 'power2.out' });

    if (colorShiftOnHover) {
      const overlay = currentTarget.querySelector('.color-overlay');
      if (overlay) gsap.to(overlay, { opacity: 0.3, duration: 0.3 });
    }
  };

  const handleMouseLeave = (e: React.MouseEvent, item: GridItem) => {
    if (!scaleOnHover) return;
    const currentTarget = e.currentTarget as HTMLElement;
    gsap.to(currentTarget, { scale: 1, zIndex: 1, duration: 0.3, ease: 'power2.out' });

    if (colorShiftOnHover) {
      const overlay = currentTarget.querySelector('.color-overlay');
      if (overlay) gsap.to(overlay, { opacity: 0, duration: 0.3 });
    }
  };

  return (
    <div ref={containerRef} className="list" style={{ height: containerHeight > 0 ? containerHeight : 'auto', minHeight: '200px' }}>
      {grid.map(item => (
        <div
          key={item.id}
          data-key={item.id}
          className="item-wrapper absolute"
          style={{
            top: item.y,
            left: item.x,
            width: item.w,
            height: item.h,
            // We do NOT set transform here, leaving it for GSAP or clean state
            // Opacity defaults to 1 unless GSAP overrides
          }}
          onClick={() => window.open(item.url, '_blank', 'noopener')}
          onMouseEnter={e => handleMouseEnter(e, item)}
          onMouseLeave={e => handleMouseLeave(e, item)}
        >
          <div className="item-img relative w-full h-full overflow-hidden rounded-[10px] shadow-lg bg-gray-800" style={{ position: 'relative' }}>
            <Image
              src={item.img}
              alt={`Gallery image ${item.id}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
              priority={grid.indexOf(item) < 8}
            />
            {colorShiftOnHover && (
              <div
                className="color-overlay absolute inset-0 opacity-0 pointer-events-none rounded-[8px]"
                style={{
                  background: 'linear-gradient(45deg, rgba(255,0,150,0.5), rgba(0,150,255,0.5))',
                }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Masonry;
