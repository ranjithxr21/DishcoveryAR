import React from 'react';
import { User, ViewMode } from '../types';
import { LogIn, UserPlus, LogOut, LayoutDashboard, Utensils, Settings } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, currentView, onNavigate, onLogout }) => {
  return (
    <header className="bg-[#121212] border-b border-white/10 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <div 
        className="flex items-center gap-2 cursor-pointer" 
        onClick={() => onNavigate(user ? (user.role === 'superadmin' ? ViewMode.SUPERADMIN : ViewMode.ADMIN) : ViewMode.LANDING)}
      >
        <img src="/logo/Dishcovery_logo.png" alt="Dishcovery" className="h-10 w-auto" />
      </div>

      <div className="flex items-center gap-4">
        {/* Navigation Links */}
        <button 
            onClick={() => onNavigate(ViewMode.MENU)}
            className={`text-sm font-medium transition-colors flex items-center gap-1 ${currentView === ViewMode.MENU ? 'text-brand-400' : 'text-gray-400 hover:text-white'}`}
        >
            <Utensils size={16} /> Demo Menu
        </button>

        <div className="h-4 w-px bg-white/10 mx-2 hidden sm:block"></div>

        {/* Auth Buttons */}
        {user ? (
          <>
            <button 
                onClick={() => onNavigate(user.role === 'superadmin' ? ViewMode.SUPERADMIN : ViewMode.ADMIN)}
                className={`text-sm font-medium transition-colors flex items-center gap-2 ${currentView === ViewMode.ADMIN || currentView === ViewMode.SUPERADMIN ? 'text-brand-400' : 'text-gray-400 hover:text-white'}`}
            >
                <LayoutDashboard size={16} /> Dashboard
            </button>
            <button 
                onClick={() => onNavigate(ViewMode.SETTINGS)}
                className={`text-sm font-medium transition-colors flex items-center gap-2 ${currentView === ViewMode.SETTINGS ? 'text-brand-400' : 'text-gray-400 hover:text-white'}`}
            >
                <Settings size={16} /> Settings
            </button>
            <button 
              onClick={onLogout}
              className="bg-red-600/10 hover:bg-red-600/20 text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-red-500/20"
            >
              <LogOut size={16} /> Logout
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => onNavigate(ViewMode.LOGIN)}
              className="text-gray-300 hover:text-white text-sm font-medium px-3 py-2"
            >
              Sign In
            </button>
            <button 
              onClick={() => onNavigate(ViewMode.SIGNUP)}
              className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-lg shadow-brand-900/20"
            >
              Try for Free <UserPlus size={16} />
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;