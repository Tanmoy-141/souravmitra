'use client';
import { useState, useEffect } from 'react';

export const Counter = ({ target, label }: { target: number, label: string }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const increment = Math.ceil(target / (duration / 50));
    const timer = setInterval(() => {
      setCount((prev) => {
        if (prev + increment >= target) {
          clearInterval(timer);
          return target;
        }
        return prev + increment;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <div className="text-center p-4">
      <div className="text-4xl font-bold text-[#C5A059]">{count}+</div>
      <div className="text-sm uppercase tracking-wider text-[#D4D4D4] mt-2">{label}</div>
    </div>
  );
};
