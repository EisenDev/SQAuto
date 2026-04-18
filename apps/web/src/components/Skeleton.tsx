"use client";
import React from 'react';

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`bg-teal-50/50 animate-pulse rounded ${className}`} />
  );
}
