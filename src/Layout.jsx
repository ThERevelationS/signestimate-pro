import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { UnsavedChangesContext } from './components/UnsavedChangesContext';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import TopNav from '@/components/corebridge/TopNav';

// ============================================================================
// CoreBridge-style application shell: persistent dark TOP navigation bar
// (Sales Home · Queues · Customers · Quick Price · Estimates · Products ·
// Settings · Tools) replaces the old sidebar. All pages remain reachable.
// The unsaved-changes navigation guard is preserved.
// ============================================================================
export default function Layout({ children }) {
  const location = useLocation();
  const { user: currentUser, moduleStatusesLoaded, hasModulePermission } = useAuth();
  const [isDirty, setIsDirty] = useState(false);
  const [showNavWarning, setShowNavWarning] = useState(false);
  const [pendingNavPath, setPendingNavPath] = useState(null);

  const handleNavClick = (e, path) => {
    if (isDirty && location.pathname !== path) {
      e.preventDefault();
      setPendingNavPath(path);
      setShowNavWarning(true);
    }
  };

  const handleConfirmNav = () => {
    setIsDirty(false);
    setShowNavWarning(false);
    if (pendingNavPath) {
      window.location.href = pendingNavPath;
    }
    setPendingNavPath(null);
  };

  const handleCancelNav = () => {
    setShowNavWarning(false);
    setPendingNavPath(null);
  };

  if (!moduleStatusesLoaded) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <UnsavedChangesContext.Provider value={{ isDirty, setIsDirty }}>
      <div className="min-h-screen flex flex-col bg-slate-100">
        <TopNav
          currentUser={currentUser}
          hasPermission={hasModulePermission}
          onNavClick={handleNavClick}
          pathname={location.pathname}
        />
        <main className="flex-1">{children}</main>
        <footer className="bg-white border-t border-slate-200 py-2 text-center">
          <p className="text-[11px] text-slate-400">© 2025 SignEstimate Pro · Professional Estimating Suite</p>
        </footer>
      </div>

      {showNavWarning && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCancelNav} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Unsaved Changes</h3>
                <p className="text-sm text-slate-500">You have unsaved changes that will be lost.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
              Are you sure you want to leave this page? Any unsaved changes will be permanently lost.
            </p>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={handleCancelNav} className="rounded-xl">
                Stay on Page
              </Button>
              <Button onClick={handleConfirmNav} className="bg-red-600 hover:bg-red-700 rounded-xl text-white">
                Leave Without Saving
              </Button>
            </div>
          </div>
        </div>
      )}
    </UnsavedChangesContext.Provider>
  );
}