'use client';

import { useState, useEffect } from 'react';

export interface CounterProps {
  target: number;
  label: string;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}

export const Counter = ({
  target,
  label,
  suffix = '+',
  prefix = '',
  duration = 2000,
  className = '',
}: CounterProps) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = 50;
    const steps = Math.max(1, Math.round(duration / interval));
    const increment = Math.max(1, Math.ceil(target / steps));

    const timer = setInterval(() => {
      setCount((prev) => {
        if (prev + increment >= target) {
          clearInterval(timer);
          return target;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [target, duration]);

  return (
    <div
      className={`counter-item text-center p-4 ${className}`}
      data-counter="item"
      data-counter-target={target}
      data-counter-suffix={suffix}
      data-counter-prefix={prefix}
    >
      <div
        className="counter-number text-4xl sm:text-5xl font-bold text-[#C5A059] font-mono tracking-tight"
        data-counter-target={target}
      >
        {prefix}{count}{suffix}
      </div>
      <div className="counter-label text-xs sm:text-sm uppercase tracking-widest text-[#D4D4D4] mt-2 font-medium">
        {label}
      </div>
    </div>
  );
};

export default Counter;
