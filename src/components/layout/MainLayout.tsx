import React, { useState } from 'react';
import { AppHeader } from './AppHeader';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, pageTitle }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 font-sans antialiased">
      <Sidebar isMobileOpen={isMobileOpen} onCloseMobile={() => setIsMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <AppHeader
          pageTitle={pageTitle}
          onToggleMobileSidebar={() => setIsMobileOpen((prev) => !prev)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

