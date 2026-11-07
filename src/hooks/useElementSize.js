import { useCallback, useEffect, useState } from 'react';

/** Returns [ref, { width, height }] for an element, kept up to date. */
export function useElementSize() {
  const [node, setNode] = useState(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = useCallback((el) => setNode(el), []);

  useEffect(() => {
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return [ref, size];
}
