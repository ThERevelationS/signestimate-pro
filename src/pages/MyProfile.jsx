import React, { useState, useEffect } from "react";
import { User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, User as UserIcon, Mail, Phone, Briefcase, Building, LogOut, Layout, RotateCcw, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FoundationProject } from "@/entities/all";

// Dummy data for projects
const dummyProjects = [];


export default function MyProfile() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [showUserDirectory, setShowUserDirectory] = useState(false);
  const [userProjects, setUserProjects] = useState([]);


  useEffect(() => {
    loadUserProfile();
    loadAllUsers();
    // Simulate loading user-specific projects
    setUserProjects(dummyProjects); // In a real app, this would be an API call based on user.id
  }, []);

  const loadUserProfile = async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error loading user profile:', error);
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  };

  const loadAllUsers = async () => {
    try {
      const users = await User.list();
      setAllUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const projs = await FoundationProject.list();
      setUserProjects(projs);
    } catch(err) {
      console.error("Error loading projects", err);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const updateProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const updateData = {
        phone: user.phone || "",
        job_title: user.job_title || "",
        department: user.department || "",
        bio: user.bio || ""
      };
      
      await User.updateMyUserData(updateData);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    }
    setIsSaving(false);
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      try {
        await User.logout();
      } catch (error) {
        console.error('Error logging out:', error);
      }
    }
  };

  const updateField = (field, value) => {
    setUser(prev => ({ ...prev, [field]: value }));
  };

  const handleResetTutorials = async () => {
    if (!confirm("Reset all tutorial popups? They will show again the next time you visit each tab.")) return;
    try {
      await User.updateMyUserData({ tutorials_seen: {} });
      setUser(prev => ({ ...prev, tutorials_seen: {} }));
      alert("Tutorials reset. They will replay as you navigate the app.");
    } catch (e) {
      console.error("Failed to reset tutorials", e);
      alert("Could not reset tutorials.");
    }
  };

  const handleToggleAutoSave = async (checked) => {
    setUser(prev => ({ ...prev, auto_save_enabled: checked }));
    try {
      await User.updateMyUserData({ auto_save_enabled: checked });
    } catch (e) {
      console.error("Failed to update auto-save preference", e);
    }
  };

  const handleToggleTutorialsDisabled = async (checked) => {
    // Switch is "Show tutorials" — when OFF, tutorials are disabled.
    const disabled = !checked;
    setUser(prev => ({ ...prev, tutorials_disabled: disabled }));
    try {
      await User.updateMyUserData({ tutorials_disabled: disabled });
    } catch (e) {
      console.error("Failed to update tutorial preference", e);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading profile...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Authentication Required</CardTitle>
            <p className="text-slate-600">Please log in to view your profile.</p>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => User.login()} className="w-full">
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRoleBadgeColor = (role) => {
    return role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
  };

  const getProjectStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'Pending':
        return 'bg-blue-100 text-blue-800';
      case 'On Hold':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <UserIcon className="w-8 h-8" />
              My Profile
            </h1>
            <p className="text-slate-600">Manage your account information and view team members</p>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl("UserManagement")}>
              <Button
                variant="outline"
                className="px-6 py-3"
              >
                View Team Directory
              </Button>
            </Link>
            <Button 
              onClick={updateProfile} 
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
            >
              {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
            </Button>
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="px-6 py-3"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information Card */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg font-semibold text-slate-900">Basic Information</CardTitle>
                <p className="text-sm text-slate-600">Your core account details</p>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input 
                      id="full_name" 
                      value={user?.full_name || ""} 
                      disabled 
                      className="mt-1 bg-slate-50"
                    />
                    <p className="text-xs text-slate-500 mt-1">Contact your administrator to change this</p>
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      value={user?.email || ""} 
                      disabled 
                      className="mt-1 bg-slate-50"
                    />
                    <p className="text-xs text-slate-500 mt-1">Contact your administrator to change this</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      value={user?.phone || ""} 
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder="Enter your phone number"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="job_title">Job Title</Label>
                    <Input 
                      id="job_title" 
                      value={user?.job_title || ""} 
                      onChange={(e) => updateField('job_title', e.target.value)}
                      placeholder="e.g., Senior Estimator"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select value={user?.department || ""} onValueChange={(value) => updateField('department', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select your department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Management">Management</SelectItem>
                      <SelectItem value="Estimating">Estimating</SelectItem>
                      <SelectItem value="Production">Production</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Administration">Administration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="bio">Bio / Description</Label>
                  <Textarea 
                    id="bio" 
                    value={user?.bio || ""} 
                    onChange={(e) => updateField('bio', e.target.value)}
                    placeholder="Tell us a bit about yourself..."
                    className="mt-1 h-24"
                  />
                </div>
              </CardContent>
            </Card>
            


            {/* Preferences Card */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg font-semibold text-slate-900">Preferences</CardTitle>
                <p className="text-sm text-slate-600">Personalize how the app behaves for you</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Auto-save Projects</p>
                      <p className="text-xs text-slate-500">Automatically save foundation projects every 30 seconds</p>
                    </div>
                  </div>
                  <Switch
                    checked={user?.auto_save_enabled !== false}
                    onCheckedChange={handleToggleAutoSave}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Show Tutorial Pop-ups</p>
                      <p className="text-xs text-slate-500">Turn off to suppress all help tours on every page</p>
                    </div>
                  </div>
                  <Switch
                    checked={user?.tutorials_disabled !== true}
                    onCheckedChange={handleToggleTutorialsDisabled}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    <RotateCcw className="w-5 h-5 text-indigo-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Reset Tutorial Popups</p>
                      <p className="text-xs text-slate-500">Replay help tours you've already dismissed</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleResetTutorials}>
                    Reset Tutorials
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* User Projects Card */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Layout className="w-5 h-5 text-slate-500" />
                  Your Projects
                </CardTitle>
                <p className="text-sm text-slate-600">Projects you are currently involved in</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {userProjects.length > 0 ? (
                  userProjects.map((project) => (
                    <div key={project.id} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-slate-900">{project.project_name || "Unnamed Project"}</h4>
                        <Badge className={getProjectStatusColor(project.status)}>
                          {project.status || "Draft"}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{project.client_name}</p>
                      <p className="text-xs text-slate-500">Last updated: {new Date(project.updated_date).toLocaleDateString()}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500 py-8">No projects found.</p>
                )}
              </CardContent>
            </Card>



          </div>

          {/* Profile Summary Sidebar */}
          <div>
            <Card className="bg-white border-0 shadow-sm sticky top-8">
              <CardHeader className="text-center border-b border-slate-100">
                <div className="w-20 h-20 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserIcon className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-xl font-semibold text-slate-900">{user?.full_name}</CardTitle>
                <div className="flex justify-center mt-2">
                  <Badge className={getRoleBadgeColor(user?.role)}>
                    {user?.role === 'admin' ? 'Administrator' : 'User'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 truncate">{user?.email}</span>
                  </div>
                  {user?.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{user.phone}</span>
                    </div>
                  )}
                  {user?.job_title && (
                    <div className="flex items-center gap-3 text-sm">
                      <Briefcase className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{user.job_title}</span>
                    </div>
                  )}
                  {user?.department && (
                    <div className="flex items-center gap-3 text-sm">
                      <Building className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{user.department}</span>
                    </div>
                  )}
                </div>
                
                {user?.bio && (
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="font-medium text-slate-900 mb-2">About</h4>
                    <p className="text-sm text-slate-600">{user.bio}</p>
                  </div>
                )}
                
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="font-medium text-slate-900 mb-2">Account Details</h4>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex justify-between">
                      <span>Member since:</span>
                      <span>{new Date(user?.created_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Role:</span>
                      <span className="capitalize">{user?.role}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}