import React, { useState, useEffect, useRef } from 'react';

/**
 * A wrapper for Recharts ResponsiveContainer that prevents rendering 
 * when the container size is invalid (<= 0), avoiding console warnings.
 */
export const SafeChartContainer = ({ children }: { children: React.ReactNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries.length) return;
      const { width, height } = entries[0].contentRect;
      
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
        // Use a small delay to ensure layout has fully stabilized
        const timer = setTimeout(() => setIsReady(true), 150);
        return () => clearTimeout(timer);
      } else {
        setIsReady(false);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[250px] relative">
      {isReady && dimensions.width > 0 ? children : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-slate-100 border-t-slate-300 rounded-full animate-spin" />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Đang tải biểu đồ...</span>
          </div>
        </div>
      )}
    </div>
  );
};
