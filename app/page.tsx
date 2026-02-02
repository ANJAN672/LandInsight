'use client';

import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto py-24 px-6 text-center">
      <span className="text-[8px] font-black bg-blue-600 text-white px-4 py-1.5 rounded-full uppercase tracking-[0.3em] mb-6 inline-block">
        Spatial Intelligence
      </span>
      <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tighter leading-tight">
        Land Insight.
      </h1>
      <p className="text-sm text-gray-400 mb-10 max-w-lg mx-auto leading-relaxed font-bold italic">
        Precise land metrics and grounded spatial valuation for the Indian landscape.
      </p>
      <div className="flex justify-center items-center gap-4">
        <Link
          href="/analyze"
          className="px-8 py-3 bg-gray-900 text-white rounded-lg text-[10px] font-black shadow-lg hover:bg-black transition-all uppercase tracking-widest"
        >
          Start Mapping
        </Link>
        <Link
          href="/login"
          className="px-8 py-3 bg-white text-gray-900 border border-gray-100 rounded-lg text-[10px] font-black shadow hover:bg-gray-50 transition-all uppercase tracking-widest"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
