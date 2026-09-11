import React, { useState, useEffect } from 'react';
import { LogOut, Bell, User as UserIcon, Menu, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AppHeaderProps {
  pageTitle: string;
  onToggleMobileSidebar?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ pageTitle, onToggleMobileSidebar }) => {
  const { profile, role, signOut } = useAuth();
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(1);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between h-16">
          
          {/* Left Logo & Brand Title */}
          <div className="flex items-center space-x-3">
            {onToggleMobileSidebar && (
              <button
                onClick={onToggleMobileSidebar}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden"
                aria-label="Toggle Navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                <Activity className="w-5.5 h-5.5 animate-pulse text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
                  KMN Automation
                </h1>
                <p className="text-xs font-semibold text-slate-500">
                  {pageTitle}
                </p>
              </div>
            </div>
          </div>

          {/* Right Notification Bell & User Controls */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            
            {/* Notifications Button */}
            <a
              href="/alerts"
              className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              title="Active Alerts & Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadAlertsCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </a>

            {/* User Info & Profile Badge */}
            <div className="flex items-center space-x-2 sm:space-x-3 border-l border-slate-200 pl-3 sm:pl-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-none">
                  {profile?.name || 'Karthick'}
                </p>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 mt-1 inline-block">
                  {role}
                </span>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center font-bold text-sm border border-slate-300">
                {profile?.name ? profile.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
              </div>

              {/* Logout Button */}
              <button
                onClick={signOut}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};


