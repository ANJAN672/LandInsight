
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
    <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center space-x-8">
        <Link to="/" className="text-xl font-bold tracking-tight text-gray-900">
          Land<span className="text-blue-600">Insight</span>
        </Link>
        <div className="hidden md:flex space-x-6 text-sm font-medium text-gray-600">
          <Link to="/analyze" className="hover:text-gray-900">Map Analyzer</Link>
          <Link to="/dashboard" className="hover:text-gray-900">Dashboard</Link>
          {user?.role === UserRole.ADMIN && (
            <Link to="/admin" className="hover:text-gray-900 text-red-600">Admin</Link>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        {user ? (
          <div className="flex items-center space-x-4">
            <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded text-gray-500 uppercase">
              {user.role}
            </span>
            <span className="text-sm text-gray-700">{user.email}</span>
            <button 
              onClick={onLogout}
              className="text-sm text-gray-500 hover:text-red-600"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button 
            onClick={() => navigate('/login')}
            className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
