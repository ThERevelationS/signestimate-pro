import React, { useEffect, useState } from 'react';
import { User } from '@/entities/all';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, Percent, AlertTriangle } from 'lucide-react';
import UserManagementTab from '@/components/admin/UserManagementTab';
import MarkupsTab from '@/components/admin/MarkupsTab';

export default function Admin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const u = await User.me();
        setCurrentUser(u);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto mb-3" />
            <h3 className="font-semibold text-amber-900">Access Restricted</h3>
            <p className="text-sm text-amber-700 mt-1">Only administrators can access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Read tab from URL (?tab=markups, ?tab=tiers (legacy), or ?tab=users)
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab');
  const initialTab = (tabParam === 'markups' || tabParam === 'tiers') ? 'markups' : 'users';

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1700px] mx-auto px-6 py-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-md">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin</h1>
              <p className="text-sm text-slate-500 mt-0.5">User management and pricing tier configuration.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1700px] mx-auto px-6 py-6">
        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />User Management</TabsTrigger>
            <TabsTrigger value="markups"><Percent className="w-4 h-4 mr-2" />Markups</TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-6">
            <UserManagementTab />
          </TabsContent>
          <TabsContent value="markups" className="mt-6">
            <MarkupsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}