import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Cpu,
  Activity,
  Stethoscope,
  HeartPulse,
  Wrench,
  Calendar,
  Bell,
  Sliders,
  FileText,
  Terminal,
  Users,
  Settings as SettingsIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/database';

interface NavItem {
  title: string;
  path: string;
  icon: React.FC<{ className?: string }>;
  roles: UserRole[];
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onCloseMobile }) => {
  const { role } = useAuth();

  const navigationGroups: NavGroup[] = [
    {
      groupTitle: 'MONITORING',
      items: [
        { title: 'Overview', path: '/overview', icon: LayoutDashboard, roles: ['admin', 'engineer', 'operator'] },
        { title: 'Motors', path: '/motors', icon: Cpu, roles: ['admin', 'engineer', 'operator'] },
        { title: 'Live Monitoring', path: '/live-monitoring', icon: Activity, roles: ['admin', 'engineer', 'operator'] },
      ],
    },
    {
      groupTitle: 'ANALYTICS',
      items: [
        { title: 'Fault Diagnosis', path: '/fault-diagnosis', icon: Stethoscope, roles: ['admin', 'engineer', 'operator'] },
        { title: 'Health & Degradation', path: '/health-degradation', icon: HeartPulse, roles: ['admin', 'engineer', 'operator'] },
      ],
    },
    {
      groupTitle: 'MAINTENANCE',
      items: [
        { title: 'Maintenance', path: '/maintenance', icon: Wrench, roles: ['admin', 'engineer', 'operator'] },
        { title: 'Schedule', path: '/schedule', icon: Calendar, roles: ['admin', 'engineer', 'operator'] },
      ],
    },
    {
      groupTitle: 'SYSTEM',
      items: [
        { title: 'Alerts', path: '/alerts', icon: Bell, roles: ['admin', 'engineer', 'operator'] },
        { title: 'Control', path: '/control', icon: Sliders, roles: ['admin', 'engineer', 'operator'] },
        { title: 'Reports', path: '/reports', icon: FileText, roles: ['admin', 'engineer'] },
        { title: 'System Logs', path: '/system-logs', icon: Terminal, roles: ['admin', 'engineer'] },
      ],
    },
    {
      groupTitle: 'ADMINISTRATION',
      items: [
        { title: 'Users', path: '/users', icon: Users, roles: ['admin'] },
        { title: 'Settings', path: '/settings', icon: SettingsIcon, roles: ['admin'] },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 transition-transform duration-200 z-50
          fixed inset-y-0 left-0 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
      >
        {/* Sidebar Header / Brand Logo */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight leading-tight">
                KMN Automation
              </h1>
              <p className="text-[10px] font-medium text-slate-400">
                Industrial Control & AI
              </p>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1 text-slate-400 hover:text-white md:hidden"
              aria-label="Close Sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          {navigationGroups.map((group) => {
            // Filter items by current user role
            const permittedItems = group.items.filter((item) => item.roles.includes(role));
            if (permittedItems.length === 0) return null;

            return (
              <div key={group.groupTitle} className="space-y-1">
                <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {group.groupTitle}
                </h3>
                {permittedItems.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => onCloseMobile?.()}
                      className={({ isActive }) =>
                        `flex items-center px-3 py-2 text-xs font-medium rounded-md transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white font-semibold shadow-sm'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`
                      }
                    >
                      <IconComponent className="w-4 h-4 mr-3 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer Info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 shrink-0">
          <div className="text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">RS-485 Modbus RTU / RPi</p>
            <p>3x 415-V Induction Motors</p>
            <p className="text-[10px] text-slate-500">24-Class DL Engine v1.2</p>
          </div>
        </div>
      </aside>
    </>
  );
};

