import React, { useState, useEffect } from 'react';
import { User, ModuleStatus, DefaultModuleSettings } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Save, Server, UserPlus, Paintbrush, Zap, Router, Wrench, Anchor, Grid3x3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Keep in sync with Layout.jsx sidebar and ModuleStatus entity enum.
const moduleDetails = {
  channel_letter_installation: { label: "Channel & Dimensional Letters | Lobby Signs", icon: Wrench, group: "top" },
  foundation: { label: "Concrete | Masonry | Poles", icon: Anchor, group: "top" },
  brick_stone: { label: "Brick & Stone", icon: Grid3x3, group: "top" },
  painting: { label: "Paint Estimator", icon: Paintbrush, group: "fab" },
  laser: { label: "Laser Cutting & Engraving", icon: Zap, group: "fab" },
  cnc: { label: "CNC Routing", icon: Router, group: "fab" },
  metal_fabrication: { label: "Metal Fabrication", icon: Wrench, group: "fab" },
};

export default function UserManagementTab() {
  const [users, setUsers] = useState([]);
  const [globalStatuses, setGlobalStatuses] = useState([]);
  const [defaultStatuses, setDefaultStatuses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleGlobalToggle = (id, currentStatus) => {
    setGlobalStatuses(cur => cur.map(s => (s.id === id ? { ...s, is_enabled: !currentStatus } : s)));
  };

  const handleDefaultToggle = (moduleName, currentStatus) => {
    setDefaultStatuses(cur => cur.map(s => (s.module_name === moduleName ? { ...s, is_enabled: !currentStatus } : s)));
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

  const renderUserPermissions = () => (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader>
        <CardTitle>User Roles & Permissions</CardTitle>
        <CardDescription>Assign roles and manage individual module access for each user.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? <p>Loading users...</p> :
          users.map(user => {
            const globalStatusMap = new Map(globalStatuses.map(s => [s.module_name, s.is_enabled]));
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
                      const isEnabled = userOverride === undefined ? globalStatusMap.get(key) ?? true : userOverride;
                      return (
                        <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                          <Label htmlFor={`${user.id}-${key}`} className="flex items-center gap-2 text-sm">
                            <details.icon className="w-4 h-4" />
                            {details.label.replace(' Module', '')}
                          </Label>
                          <div className="flex items-center gap-2">
                            {userOverride !== undefined && <Badge variant="outline" className="text-xs">Overridden</Badge>}
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

  const renderGlobalAccess = () => (
    <Card className="bg-white border-0 shadow-sm">
      <CardHeader>
        <CardTitle>Global Module Access</CardTitle>
        <CardDescription>Enable or disable modules for all users. Individual user overrides still apply.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? <p>Loading modules...</p> :
          globalStatuses.map(status => {
            const details = moduleDetails[status.module_name];
            return (
              <div key={status.module_name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <details.icon className="w-6 h-6 text-slate-600" />
                  <Label className="text-lg font-medium">{details.label}</Label>
                </div>
                <Switch checked={status.is_enabled} onCheckedChange={() => handleGlobalToggle(status.id, status.is_enabled)} />
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
            return (
              <div key={status.module_name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <details.icon className="w-6 h-6 text-slate-600" />
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="permissions"><Users className="w-4 h-4 mr-2" />User Permissions</TabsTrigger>
          <TabsTrigger value="global"><Server className="w-4 h-4 mr-2" />Global Access</TabsTrigger>
          <TabsTrigger value="default"><UserPlus className="w-4 h-4 mr-2" />New User Defaults</TabsTrigger>
        </TabsList>
        <TabsContent value="permissions" className="mt-6">{renderUserPermissions()}</TabsContent>
        <TabsContent value="global" className="mt-6">{renderGlobalAccess()}</TabsContent>
        <TabsContent value="default" className="mt-6">{renderDefaultAccess()}</TabsContent>
      </Tabs>
    </div>
  );
}