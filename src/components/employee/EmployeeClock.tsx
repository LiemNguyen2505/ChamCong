import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { motion } from 'motion/react';

export const EmployeeClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-xl md:text-2xl font-mono font-black tracking-wider text-white flex items-center">
      <span>{format(time, 'HH')}</span>
      <span className="animate-pulse-clock mx-0.5">:</span>
      <span>{format(time, 'mm')}</span>
      <span className="animate-pulse-clock mx-0.5">:</span>
      <motion.span
        key={format(time, 'ss')}
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="inline-block min-w-[1.2em]"
      >
        {format(time, 'ss')}
      </motion.span>
    </div>
  );
};
