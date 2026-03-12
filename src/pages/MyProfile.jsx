
import React, { useState, useEffect } from "react";
import { User } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, User as UserIcon, Mail, Phone, Briefcase, Building, LogOut, Paintbrush, Layout } from "lucide-react";

// Dummy data for projects and paint colors
const dummyProjects = [
  { id: "proj-1", name: "Living Room Renovation", description: "Complete overhaul of the living room including new paint, flooring, and furniture.", status: "In Progress", dueDate: "2024-08-15" },
  { id: "proj-2", name: "Kitchen Cabinet Refinishing", description: "Sanding and repainting kitchen cabinets with a new finish. Client approved color 'Pearl White'.", status: "Completed", dueDate: "2024-06-30" },
  { id: "proj-3", name: "Exterior Paint Job", description: "Painting the entire exterior of the house. Requires scaffolding.", status: "Pending", dueDate: "2024-09-01" },
  { id: "proj-4", name: "Bathroom Remodel", description: "Installation of new tiles, vanity, and shower. Plumbing work scheduled.", status: "On Hold", dueDate: "2024-10-20" },
];

const dummyPaintColors = [
  { id: "color-1", name: "Whisper White", hex: "#F8F8F8", suggestedFor: "Ceilings, Modern Interiors" },
  { id: "color-2", name: "Sky Blue", hex: "#87CEEB", suggestedFor: "Bedrooms, Kids Rooms" },
  { id: "color-3", name: "Forest Green", hex: "#228B22", suggestedFor: "Feature Walls, Nature-themed spaces" },
  { id: "color-4", name: "Warm Grey", hex: "#A9A9A9", suggestedFor: "Living Rooms, Commercial Spaces" },
  { id: "color-5", name: "Terracotta", hex: "#E2725B", suggestedFor: "Accents, Mediterranean style" },
  { id: "color-6", name: "Navy Blue", hex: "#000080", suggestedFor: "Elegant spaces, Home Offices" },
];


export default function MyProfile() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [showUserDirectory, setShowUserDirectory] = useState(false);
  // New state for projects and paint colors (using dummy data for now)
  const [userProjects, setUserProjects] = useState([]);
  const [paintColorSuggestions, setPaintColorSuggestions] = useState([]);


  useEffect(() => {
    loadUserProfile();
    loadAllUsers();
    // Simulate loading user-specific projects and paint suggestions
    setUserProjects(dummyProjects); // In a real app, this would be an API call based on user.id
    setPaintColorSuggestions(dummyPaintColors); // In a real app, this could be dynamic
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
            <Button
              onClick={() => setShowUserDirectory(!showUserDirectory)}
              variant="outline"
              className="px-6 py-3"
            >
              {showUserDirectory ? 'Hide' : 'View'} Team Directory
            </Button>
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
            
            {/* Team Directory */}
            {showUserDirectory && (
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="text-lg font-semibold text-slate-900">Team Directory</CardTitle>
                  <p className="text-sm text-slate-600">Other users in your organization</p>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {allUsers.filter(u => u.id !== user?.id).map((teamUser) => (
                    <div key={teamUser.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                      <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">{teamUser.full_name}</h4>
                        <p className="text-sm text-slate-600">{teamUser.email}</p>
                        {teamUser.job_title && <p className="text-sm text-slate-500">{teamUser.job_title}</p>}
                        {teamUser.department && <p className="text-xs text-slate-500">{teamUser.department}</p>}
                      </div>
                      <Badge className={getRoleBadgeColor(teamUser.role)}>
                        {teamUser.role === 'admin' ? 'Admin' : 'User'}
                      </Badge>
                    </div>
                  ))}
                  {allUsers.filter(u => u.id !== user?.id).length === 0 && (
                    <p className="text-center text-slate-500 py-8">No other team members found.</p>
                  )}
                </CardContent>
              </Card>
            )}

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
                        <h4 className="font-medium text-slate-900">{project.name}</h4>
                        <Badge className={getProjectStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{project.description}</p>
                      {project.dueDate && (
                        <p className="text-xs text-slate-500">Due: {new Date(project.dueDate).toLocaleDateString()}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500 py-8">No projects found.</p>
                )}
              </CardContent>
            </Card>

            {/* Paint Color Suggestions Card */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Paintbrush className="w-5 h-5 text-slate-500" />
                  Paint Color Suggestions
                </CardTitle>
                <p className="text-sm text-slate-600">Explore popular color palettes for your next project</p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-6">
                {paintColorSuggestions.length > 0 ? (
                  paintColorSuggestions.map((color) => (
                    <div key={color.id} className="flex flex-col items-center p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                      <div className="w-16 h-16 rounded-full border-2 border-slate-200 mb-2" style={{ backgroundColor: color.hex }}></div>
                      <h4 className="font-medium text-slate-900 text-sm">{color.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">{color.suggestedFor}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500 py-8 col-span-full">No color suggestions available.</p>
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