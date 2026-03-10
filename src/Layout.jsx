import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UnsavedChangesContext } from './components/UnsavedChangesContext';

import { createPageUrl } from '@/utils';
import { ModuleStatus, User } from '@/entities/all';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { 
  Paintbrush, 
  Zap, 
  Router, 
  Wrench, 
  Settings, 
  Eye,
  Server,
  User as UserIcon,
  Users,
  Anchor,
  ChevronDown
} from 'lucide-react';

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [moduleStatuses, setModuleStatuses] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedModule, setExpandedModule] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleNavClick = (e, path) => {
    if (isDirty && location.pathname !== path) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to leave? Your changes will be lost.')) {
        e.preventDefault();
      } else {
        setIsDirty(false);
      }
    }
  };

  const handleToggle = (moduleId) => {
    setExpandedModule(prev => prev === moduleId ? null : moduleId);
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [user, statuses] = await Promise.all([
          User.me(),
          ModuleStatus.list()
        ]);
        setCurrentUser(user);
        
        const statusObj = {};
        statuses.forEach(status => {
          statusObj[status.module_name] = status.is_enabled;
        });
        setModuleStatuses(statusObj);

      } catch (error) {
        console.error('Error loading layout prerequisites:', error);
        setCurrentUser(null);
        setModuleStatuses({
          painting: true, laser: true, cnc: true, metal_fabrication: true, channel_letter_installation: true, foundation: true, brick_stone: true
        });
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  const hasPermission = (moduleName) => {
    const globalStatus = moduleStatuses[moduleName];
    if (globalStatus === false) {
      return false;
    }
    
    if (!currentUser) {
      return globalStatus !== undefined ? globalStatus : true;
    }
    
    if (currentUser.module_permissions && currentUser.module_permissions[moduleName] !== undefined) {
      return currentUser.module_permissions[moduleName];
    }
    
    return globalStatus !== undefined ? globalStatus : true;
  };

  const modules = [
    {
      id: 'painting',
      name: 'Paint Estimator',
      icon: Paintbrush,
      projectsPage: 'PaintProjects',
      newEstimatePage: 'NewPaintEstimate',
      settingsPage: 'PaintSettings',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:bg-blue-100'
    },
    {
      id: 'laser',
      name: 'Laser Cutting & Engraving',
      icon: Zap,
      projectsPage: 'LaserProjects',
      newEstimatePage: 'NewLaserEstimate',
      settingsPage: 'LaserSettings',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      hoverColor: 'hover:bg-red-100'
    },
    {
      id: 'cnc',
      name: 'CNC Routing',
      icon: Router,
      projectsPage: 'CNCProjects',
      newEstimatePage: 'NewCNCEstimate',
      settingsPage: 'CNCSettings',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      hoverColor: 'hover:bg-green-100'
    },
    {
      id: 'metal_fabrication',
      name: 'Metal Fabrication',
      icon: Wrench,
      projectsPage: 'MetalProjects',
      newEstimatePage: 'NewMetalEstimate',
      settingsPage: 'MetalSettings',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      hoverColor: 'hover:bg-orange-100',
      inventoryPage: 'Inventory'
    },
    {
      id: 'channel_letter_installation',
      name: 'Channel Letter Install',
      icon: Wrench,
      projectsPage: 'ChannelLetterInstallationProjects',
      newEstimatePage: 'NewChannelLetterInstallation',
      settingsPage: 'ChannelLetterInstallationSettings',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      hoverColor: 'hover:bg-purple-100'
    },
    {
      id: 'foundation',
      name: 'Foundation',
      icon: Anchor,
      projectsPage: 'FoundationProjects',
      newEstimatePage: 'NewFoundationEstimate',
      settingsPage: 'FoundationSettings',
      inventoryPage: 'FoundationInventory',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      hoverColor: 'hover:bg-amber-100'
    },
    {
      id: 'brick_stone_2',
      name: 'Brick & Stone 2',
      icon: Server,
      projectsPage: 'BrickStoneProjects2',
      newEstimatePage: 'NewBrickStoneEstimate2',
      settingsPage: 'BrickStoneSettings2',
      inventoryPage: 'BrickStoneInventory2',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      hoverColor: 'hover:bg-pink-100'
    }
  ];

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
  <UnsavedChangesContext.Provider value={{ isDirty, setIsDirty }}>
  <SidebarProvider>
    <div className="flex min-h-screen w-full">
      <Sidebar className="border-r border-slate-200 bg-white z-[100] sticky top-0 h-screen shadow-xl">
          <SidebarHeader className="border-b border-slate-200 p-6">
            <Link to={createPageUrl("Dashboard")} onClick={(e) => handleNavClick(e, createPageUrl("Dashboard"))} className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">SE</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">SignEstimate Pro</h1>
                <p className="text-sm text-slate-500">Professional Estimating</p>
              </div>
            </Link>
          </SidebarHeader>

          <SidebarContent className="px-4 py-4">
            <SidebarMenu className="space-y-1">
              {modules.map((module) => {
                const isEnabled = hasPermission(module.id);

                if (!isEnabled) {
                  return null;
                }

                const isExpanded = expandedModule === module.id;

                return (
                  <SidebarMenuItem key={module.id}>
                    <div 
                      className={`${module.bgColor} ${module.hoverColor} rounded-xl p-3 transition-all duration-200 cursor-pointer`}
                      onClick={() => handleToggle(module.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <module.icon className={`w-5 h-5 ${module.color}`} />
                          <span className="font-semibold text-slate-900 text-sm">{module.name}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>

                      <div 
                        className="space-y-1 transition-all duration-300 ease-in-out"
                        style={{
                          maxHeight: isExpanded ? '500px' : '0px',
                          opacity: isExpanded ? 1 : 0,
                          overflow: 'hidden',
                          pointerEvents: isExpanded ? 'auto' : 'none'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link
                          to={createPageUrl(module.projectsPage)}
                          onClick={(e) => handleNavClick(e, createPageUrl(module.projectsPage))}
                          className={`text-xs px-2 py-1.5 rounded-lg transition-colors flex items-center w-full ${
                            location.pathname === createPageUrl(module.projectsPage)
                              ? 'bg-white text-slate-900 font-medium shadow-sm'
                              : 'text-slate-700 hover:bg-white/60'
                          }`}
                        >
                          View Projects
                        </Link>
                        
                        <Link
                          to={createPageUrl(module.newEstimatePage)}
                          onClick={(e) => handleNavClick(e, createPageUrl(module.newEstimatePage))}
                          className={`text-xs px-2 py-1.5 rounded-lg transition-colors flex items-center w-full ${
                            location.pathname === createPageUrl(module.newEstimatePage)
                              ? 'bg-white text-slate-900 font-medium shadow-sm'
                              : 'text-slate-700 hover:bg-white/60'
                          }`}
                        >
                          New Estimate
                        </Link>
                        
                        {module.inventoryPage && (
                          <Link
                            to={createPageUrl(module.inventoryPage)}
                            onClick={(e) => handleNavClick(e, createPageUrl(module.inventoryPage))}
                            className={`text-xs px-2 py-1.5 rounded-lg transition-colors flex items-center w-full ${
                              location.pathname === createPageUrl(module.inventoryPage)
                                ? 'bg-white text-slate-900 font-medium shadow-sm'
                                : 'text-slate-700 hover:bg-white/60'
                            }`}
                          >
                            <Server className="w-3 h-3 mr-1" />
                            Inventory
                          </Link>
                        )}
                        
                        <Link
                          to={createPageUrl(module.settingsPage)}
                          onClick={(e) => handleNavClick(e, createPageUrl(module.settingsPage))}
                          className={`text-xs px-2 py-1.5 rounded-lg transition-colors flex items-center w-full ${
                            location.pathname === createPageUrl(module.settingsPage)
                              ? 'bg-white text-slate-900 font-medium shadow-sm'
                              : 'text-slate-700 hover:bg-white/60'
                          }`}
                        >
                          <Settings className="w-3 h-3 mr-1" />
                          Settings
                        </Link>
                      </div>
                    </div>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200 p-3 space-y-1">
            <SidebarMenu>
                <SidebarMenuItem>
                    <Link 
                      to={createPageUrl("FormulaViewer")}
                      onClick={(e) => handleNavClick(e, createPageUrl("FormulaViewer"))}
                      className={`flex items-center gap-2 px-3 py-2 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 rounded-xl ${
                        location.pathname === createPageUrl("FormulaViewer") ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600'
                      }`}
                    >
                      <Eye className="w-4 h-4"/>
                      <span className="font-medium text-sm">Formula Viewer</span>
                    </Link>
                </SidebarMenuItem>
                {currentUser?.role === 'admin' && (
                  <SidebarMenuItem>
                    <Link 
                      to={createPageUrl("UserManagement")} 
                      className={`flex items-center gap-2 px-3 py-2 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 rounded-xl ${
                        location.pathname === createPageUrl("UserManagement") ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600'
                      }`}
                    >
                      <Users className="w-4 h-4"/>
                      <span className="font-medium text-sm">User Management</span>
                    </Link>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                    <Link 
                      to={createPageUrl("MyProfile")} 
                      className={`flex items-center gap-2 px-3 py-2 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 rounded-xl ${
                        location.pathname === createPageUrl("MyProfile") ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600'
                      }`}
                    >
                      <UserIcon className="w-4 h-4"/>
                      <span className="font-medium text-sm">My Profile</span>
                    </Link>
                </SidebarMenuItem>
            </SidebarMenu>
            
            <div className="pt-2 border-t border-slate-200">
              <p className="text-xs text-slate-500 text-center">© 2025 SignEstimate Pro</p>
              <p className="text-xs text-slate-400 text-center">Professional Estimating Suite</p>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="border-b border-slate-200 bg-white px-6 py-4 sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="lg:hidden" />
              <h2 className="text-xl font-semibold text-slate-900 capitalize">
                {currentPageName?.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </h2>
            </div>
          </header>
          
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  </UnsavedChangesContext.Provider>
  );
}