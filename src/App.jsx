import './App.css'
import { Suspense, lazy } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { setupIframeMessaging } from './lib/iframe-messaging';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import RouteSkeleton from '@/components/RouteSkeleton';

// Pages created after pages.config.js stopped being auto-generated need
// explicit routes (the pagesConfig loop below only knows about older pages).
const AllInOneProjects = lazy(() => import('@/pages/AllInOneProjects'));
const NewAllInOneEstimate = lazy(() => import('@/pages/NewAllInOneEstimate'));
const QuickProducts = lazy(() => import('@/pages/QuickProducts'));
const EstimateSettings = lazy(() => import('@/pages/EstimateSettings'));
const QuickProductEditor = lazy(() => import('@/pages/QuickProductEditor'));

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : (() => null);

setupIframeMessaging();

// After a redeploy, old lazy-chunk hashes become invalid and produce
// "Failed to fetch dynamically imported module" errors. Reload once (guarded
// by sessionStorage so we never loop) to pull the fresh chunk manifest.
const handleChunkLoadError = (message) => {
  if (typeof message === 'string' &&
      /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(message)) {
    const key = 'chunk_reload_once';
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      window.location.reload();
      return true;
    }
  }
  return false;
};

window.addEventListener('error', (e) => handleChunkLoadError(e?.message));
window.addEventListener('unhandledrejection', (e) => handleChunkLoadError(e?.reason?.message || String(e?.reason || '')));
// Clear the guard once the app successfully boots so future redeploys can retry.
window.addEventListener('load', () => {
  setTimeout(() => sessionStorage.removeItem('chunk_reload_once'), 4000);
});

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app. The Layout stays mounted around the Suspense boundary
  // so the sidebar / header don't unmount while a lazy chunk is downloading.
  return (
    <LayoutWrapper currentPageName={mainPageKey}>
      <Suspense fallback={<RouteSkeleton />}>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/AllInOneProjects" element={<AllInOneProjects />} />
          <Route path="/NewAllInOneEstimate" element={<NewAllInOneEstimate />} />
          <Route path="/QuickProducts" element={<QuickProducts />} />
          <Route path="/EstimateSettings" element={<EstimateSettings />} />
          <Route path="/QuickProductEditor" element={<QuickProductEditor />} />
          {Object.entries(Pages).map(([path, Page]) => (
            <Route key={path} path={`/${path}`} element={<Page />} />
          ))}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Suspense>
    </LayoutWrapper>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App