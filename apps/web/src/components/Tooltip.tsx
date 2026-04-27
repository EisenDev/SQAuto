import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

export default function Tooltip({ content }: { content: string }) {
  const [show, setShow] = useState(false);

  return (
    <div 
      className="relative flex items-center ml-2 z-10"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      <HelpCircle className="w-3 h-3 text-white/50 hover:text-white transition-colors cursor-help" />
      {show && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-48 sm:w-64 bg-gray-900 text-gray-100 text-[10px] sm:text-xs font-mono p-3 rounded-lg shadow-2xl normal-case font-normal whitespace-normal tracking-normal border border-gray-700">
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-gray-900"></div>
          {content}
        </div>
      )}
    </div>
  );
}
