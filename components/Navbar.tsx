
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserRole, User } from '../types';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-5 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center space-x-12">
        <Link to="/" className="text-xl font-black tracking-tighter text-gray-900 flex items-center gap-2 group">
          <div className="w-6 h-6 bg-gray-900 rounded flex items-center justify-center group-hover:rotate-12 transition-transform">
            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
          <span>Land<span className="text-blue-600 italic">Insight</span></span>
        </Link>
        <div className="hidden md:flex space-x-8 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
          <Link to="/analyze" className="hover:text-gray-900 transition-colors py-1 border-b-2 border-transparent hover:border-blue-600">Map Analyzer</Link>
          <Link to="/dashboard" className="hover:text-gray-900 transition-colors py-1 border-b-2 border-transparent hover:border-blue-600">
            {user?.role === UserRole.ADMIN ? 'Dashboard' : 'Land Vault'}
          </Link>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        {user ? (
          <div className="flex items-center space-x-6">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-black text-gray-900 uppercase tracking-tighter">{user.name || 'Professional'}</div>
              <div className="text-[8px] text-gray-400 font-black uppercase tracking-widest">{user.role}</div>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 text-[9px] font-black bg-gray-50 text-gray-400 rounded-lg hover:text-red-500 hover:bg-red-50 transition-all uppercase tracking-widest border border-gray-100"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 text-[9px] font-black bg-gray-900 text-white rounded-xl hover:bg-black shadow-lg shadow-gray-200 transition-all uppercase tracking-widest"
          >
            Access Portal
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
