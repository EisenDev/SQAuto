"use client";
import React from 'react';

interface SummaryCardProps {
  title: string;
  value: React.ReactNode;
}

export default function SummaryCard({ title, value }: SummaryCardProps) {
  return (
    <div className="border border-teal-100 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow group">
      <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-2 group-hover:text-teal-500 transition-colors">
        {title}
      </h3>
      <p className="text-2xl font-bold text-gray-800 tabular-nums">
        {value}
      </p>
    </div>
  );
}
