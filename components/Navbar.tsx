'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

const Navbar: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-[73px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100 group-hover:shadow-blue-200 transition-all">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-[13px] font-black tracking-tight">
              Land<span className="text-blue-600">Insight</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/analyze"
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${isActive('/analyze')
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              Map Analyzer
            </Link>
            {user && (
              <>
                <Link
                  href="/chat"
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${isActive('/chat')
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                  AI Chat
                </Link>
                <Link
                  href="/dashboard"
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${isActive('/dashboard')
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                  Land Vault
                </Link>
              </>
            )}
          </div>

          {/* Auth Section */}
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-[9px] font-black text-white uppercase">
                    {user.name?.[0] || user.email[0]}
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 max-w-[100px] truncate">{user.name || user.email}</span>
                </div>
                <button
                  onClick={logout}
                  className="px-4 py-2 text-[10px] font-black text-gray-400 hover:text-red-600 uppercase tracking-widest transition-all"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-[10px] font-black text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
