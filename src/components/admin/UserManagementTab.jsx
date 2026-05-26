import React, { useState, useEffect } from 'react';
import { User, ModuleStatus, DefaultModuleSettings } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, Save, Server, UserPlus, Lock, Unlock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MODULES, MODULES_BY_KEY } from '@/components/modulesRegistry';

// Keep in sync with Layout.jsx sidebar via the shared registry.
const moduleDetails = MODULES.reduce((acc, m) => {
  acc[m.key] = { label: m.shortName, icon: m.icon };
  return acc;
}, {});

export default function UserManagementTab() {
  const [users, setUsers] = useState([]);
  const [globalStatuses, setGlobalStatuses] = useState([]);
  const [defaultStatuses, setDefaultStatuses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // Per-user, per-module lock state. Locked overrides are immune to global cascade.
  // Shape: { [userId]: { [moduleKey]: true } }
  const [locks, setLocks] = useState({});

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [allUsersData, globalStatusData, defaultStatusData] = await Promise.all([
          User.list(),
          ModuleStatus.list(),
          DefaultModuleSettings.list(),
        ]);
        setUsers(allUsersData);

        const globalStatusMap = new Map(globalStatusData.map(s => [s.module_name, s]));
        setGlobalStatuses(Object.keys(moduleDetails).map(key => globalStatusMap.get(key) || { module_name: key, is_enabled: true }));

        const defaultStatusMap = new Map(defaultStatusData.map(s => [s.module_name, s]));
        setDefaultStatuses(Object.keys(moduleDetails).map(key => defaultStatusMap.get(key) || { module_name: key, is_enabled: true }));
      } catch (error) {
        console.error("Error loading user management data:", error);
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleRoleChange = (userId, newRole) => {
    setUsers(cur => cur.map(u => (u.id === userId ? { ...u, role: newRole } : u)));
  };

  const handleUserPermissionToggle = (userId, moduleName) => {
    setUsers(cur => cur.map(user => {
      if (user.id !== userId) return user;
      const currentPermissions = user.module_permissions || {};
      const globalStatus = globalStatuses.find(s => s.module_name === moduleName)?.is_enabled ?? true;
      const newPermission = currentPermissions[moduleName] === undefined ? !globalStatus : !currentPermissions[moduleName];
      return { ...user, module_permissions: { ...currentPermissions, [moduleName]: newPermission } };
    }));
  };

  // Global toggle cascades to every user (except those with a lock on that module).
  const handleGlobalToggle = (moduleName, currentStatus) => {
    const newStatus = !currentStatus;
    setGlobalStatuses(cur => cur.map(s => (s.module_name === moduleName ? { ...s, is_enabled: newStatus } : s)));
    setUsers(cur => cur.map(user => {
      if (locks[user.id]?.[moduleName]) return user; // locked — don't touch
      const currentPermissions = user.module_permissions || {};
      return { ...user, module_permissions: { ...currentPermissions, [moduleName]: newStatus } };
    }));
  };

  const handleDefaultToggle = (moduleName, currentStatus) => {
    setDefaultStatuses(cur => cur.map(s => (s.module_name === moduleName ? { ...s, is_enabled: !currentStatus } : s)));
  };

  const toggleLock = (userId, moduleName) => {
    setLocks(cur => {
      const userLocks = { ...(cur[userId] || {}) };
      if (userLocks[moduleName]) delete userLocks[moduleName];
      else userLocks[moduleName] = true;
      return { ...cur, [userId]: userLocks };
    });
  };

  const saveAllChanges = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        ...users.map(user => User.update(user.id, {
          role: user.role,
          module_permissions: user.module_permissions,
          enable_ccs_database_lookup: user.enable_ccs_database_lookup,
        })),
        ...globalStatuses.map(status => status.id ? ModuleStatus.update(status.id, { is_enabled: status.is_enabled }) : ModuleStatus.create(status)),
        ...defaultStatuses.map(status => status.id ? DefaultModuleSettings.update(status.id, { is_enabled: status.is_enabled }) : DefaultModuleSettings.create(status)),
      ]);
      alert("All changes saved successfully!");
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("Failed to save changes. Please try again.");
    }
    setIsSaving(false);
  };

  const getRoleBadgeColor = (role) => role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';

  // Compact horizontal strip — replaces the old full-size Global Access tab.
  const renderGlobalAccessStrip = () => (
    <div className="border border-slate-200 rounded-lg bg-slate-50 px-3 py-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-semibold text-slate-800">Global Module Access</span>
        </div>
        <span className="text-[11px] text-slate-500">Toggling cascades to all unlocked users below.</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1.5">
        {globalStatuses.map(status => {
          const details = moduleDetails[status.module_name];
          if (!details) return null;
          const Icon = details.icon;
          return (
            <div key={status.module_name} className="flex items-center justify-between bg-white border border-slate-200 rounded px-2 py-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Icon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <span className="text-[11px] font-medium text-slate-700 truncate">{details.label}</span>
              </div>
              <Switch
                checked={status.is_enabled}
                onCheckedChange={() => handleGlobalToggle(status.module_name, status.is_enabled)}
                className="scale-75"
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderUserPermissions = () => (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader>
        <CardTitle>User Roles & Permissions</CardTitle>
        <CardDescription>Assign roles and manage individual module access for each user.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Global Access strip — moved here from its own tab */}
        {!isLoading && renderGlobalAccessStrip()}

        {isLoading ? <p>Loading users...</p> :
          users.map(user => {
            return (
              <div key={user.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium">{user.full_name}</span>
                    <span className="text-sm text-slate-500">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={getRoleBadgeColor(user.role)}>{user.role}</Badge>
                    <Select value={user.role} onValueChange={(newRole) => handleRoleChange(user.id, newRole)}>
                      <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Standard User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <Label className="font-medium text-slate-700">Database Search Permissions</Label>
                  <div className="flex items-center justify-between p-3 mt-2 mb-4 bg-slate-50 rounded-md border border-slate-100">
                    <Label htmlFor={`ccs-${user.id}`} className="flex items-center gap-2 text-sm font-medium">
                      <Server className="w-4 h-4 text-indigo-600" />
                      Enable CCS Database Lookup
                    </Label>
                    <Switch
                      id={`ccs-${user.id}`}
                      checked={user.enable_ccs_database_lookup || false}
                      onCheckedChange={(checked) => setUsers(cur => cur.map(u => u.id === user.id ? { ...u, enable_ccs_database_lookup: checked } : u))}
                    />
                  </div>
                  <Label className="font-medium text-slate-700">Module Access Overrides</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    {Object.entries(moduleDetails).map(([key, details]) => {
                      const userOverride = user.module_permissions?.[key];
                      const globalStatus = globalStatuses.find(s => s.module_name === key)?.is_enabled ?? true;
                      const isEnabled = userOverride === undefined ? globalStatus : userOverride;
                      const isLocked = !!locks[user.id]?.[key];
                      const Icon = details.icon;
                      return (
                        <div key={key} className={`flex items-center justify-between p-3 rounded-md border ${isLocked ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-transparent'}`}>
                          <Label htmlFor={`${user.id}-${key}`} className="flex items-center gap-2 text-sm">
                            <Icon className="w-4 h-4" />
                            {details.label}
                          </Label>
                          <div className="flex items-center gap-2">
                            {userOverride !== undefined && <Badge variant="outline" className="text-xs">Overridden</Badge>}
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => toggleLock(user.id, key)}
                                    className={`p-1 rounded transition-colors ${isLocked ? 'text-amber-600 hover:bg-amber-100' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
                                    aria-label={isLocked ? "Unlock — global toggles can change this" : "Lock — protect from global toggles"}
                                  >
                                    {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {isLocked ? "Locked — Global Access toggles won't change this" : "Click to lock — protects from Global Access cascade"}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Switch id={`${user.id}-${key}`} checked={isEnabled} onCheckedChange={() => handleUserPermissionToggle(user.id, key)} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        }
      </CardContent>
    </Card>
  );

  const renderDefaultAccess = () => (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader>
        <CardTitle>Default New User Access</CardTitle>
        <CardDescription>Set the default module access for newly created accounts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? <p>Loading defaults...</p> :
          defaultStatuses.map(status => {
            const details = moduleDetails[status.module_name];
            if (!details) return null;
            const Icon = details.icon;
            return (
              <div key={status.module_name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Icon className="w-6 h-6 text-slate-600" />
                  <Label className="text-lg font-medium">{details.label}</Label>
                </div>
                <Switch checked={status.is_enabled} onCheckedChange={() => handleDefaultToggle(status.module_name, status.is_enabled)} />
              </div>
            );
          })
        }
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={saveAllChanges} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
          {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" />Save All Changes</>}
        </Button>
      </div>
      <Tabs defaultValue="permissions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="permissions"><Users className="w-4 h-4 mr-2" />User Permissions</TabsTrigger>
          <TabsTrigger value="default"><UserPlus className="w-4 h-4 mr-2" />New User Defaults</TabsTrigger>
        </TabsList>
        <TabsContent value="permissions" className="mt-6">{renderUserPermissions()}</TabsContent>
        <TabsContent value="default" className="mt-6">{renderDefaultAccess()}</TabsContent>
      </Tabs>
    </div>
  );
}