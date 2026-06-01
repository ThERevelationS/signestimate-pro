import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  // Cached app-wide module enablement map { module_name: is_enabled }.
  // Fetched once on bootstrap so Layout + Dashboard don't both refetch.
  const [moduleStatuses, setModuleStatuses] = useState({});
  const [moduleStatusesLoaded, setModuleStatusesLoaded] = useState(false);

  useEffect(() => {
    checkAppState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const appClient = createAxiosClient({
        baseURL: `${appParams.serverUrl}/api/apps/public`,
        headers: { 'X-App-Id': appParams.appId },
        token: appParams.token,
        interceptResponses: true
      });

      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);

        // If we have a token, fetch the current user AND the module-status list
        // in parallel — they're independent and both needed by Layout/Dashboard.
        if (appParams.token) {
          await fetchAuthAndModules();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          // Still try to load module statuses (they're public read).
          loadModuleStatuses();
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);

        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({ type: 'auth_required', message: 'Authentication required' });
          } else if (reason === 'user_not_registered') {
            setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
          } else {
            setAuthError({ type: reason, message: appError.message });
          }
        } else {
          setAuthError({ type: 'unknown', message: appError.message || 'Failed to load app' });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  // Fetch user + module statuses concurrently. Either can fail independently
  // without breaking the other — auth failures still set authError; module
  // status failures just leave the cache empty (Layout falls back to enabled).
  const fetchAuthAndModules = async () => {
    setIsLoadingAuth(true);
    const [userResult, modulesResult] = await Promise.allSettled([
      base44.auth.me(),
      base44.entities.ModuleStatus.list(),
    ]);

    if (userResult.status === 'fulfilled') {
      setUser(userResult.value);
      setIsAuthenticated(true);
    } else {
      const error = userResult.reason;
      console.error('User auth check failed:', error);
      setIsAuthenticated(false);
      if (error?.status === 401 || error?.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    }

    if (modulesResult.status === 'fulfilled') {
      const map = {};
      (modulesResult.value || []).forEach((s) => {
        map[s.module_name] = s.is_enabled;
      });
      setModuleStatuses(map);
    } else {
      console.error('ModuleStatus.list failed:', modulesResult.reason);
    }
    setModuleStatusesLoaded(true);
    setIsLoadingAuth(false);
  };

  const loadModuleStatuses = useCallback(async () => {
    try {
      const list = await base44.entities.ModuleStatus.list();
      const map = {};
      (list || []).forEach((s) => { map[s.module_name] = s.is_enabled; });
      setModuleStatuses(map);
    } catch (error) {
      console.error('ModuleStatus.list failed:', error);
    } finally {
      setModuleStatusesLoaded(true);
    }
  }, []);

  // Permission helper used by sidebar + dashboard.
  // Per-user override (user.module_permissions) wins over the global flag,
  // and any unknown module defaults to enabled to preserve existing behavior.
  const hasModulePermission = useCallback((moduleName) => {
    if (user?.module_permissions && user.module_permissions[moduleName] !== undefined) {
      return user.module_permissions[moduleName];
    }
    return moduleStatuses[moduleName] !== undefined ? moduleStatuses[moduleName] : true;
  }, [user, moduleStatuses]);

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      moduleStatuses,
      moduleStatusesLoaded,
      hasModulePermission,
      refreshModuleStatuses: loadModuleStatuses,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};