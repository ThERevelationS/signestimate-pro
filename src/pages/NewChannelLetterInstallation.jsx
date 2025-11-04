import React, { useState, useEffect, useCallback } from "react";
import { ChannelLetterInstallation, Settings } from "@/entities/all";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Save, Plus, ArrowLeft, Wrench } from "lucide-react";

export default function NewChannelLetterInstallation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [isEditing, setIsEditing] = useState(false);

  const [project, setProject] = useState({
    project_name: "",
    client_name: "",
    estimate_number: "",
    hyperlink: "",
    installation_type: "flush_mount",
    qty_letters: 10,
    letter_size: "medium",
    letter_height_inches: 24,
    installation_height_feet: 12,
    raceway_length_feet: 8,
    thick_hollow_walls: false,
    parapet: false,
    poor_electrical_access: false,
    base_supplies_cost: 150,
    extra_supplies_cost: 0,
    notes: ""
  });

  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const settingsData = await Settings.list();
      const settingsObj = {};
      settingsData.forEach(s => {
        settingsObj[s.setting_name] = s.setting_value;
      });
      setSettings(settingsObj);
      
      if (!editId) {
        setProject(prev => ({
          ...prev,
          base_supplies_cost: parseFloat(settingsObj.install_base_supplies) || 150
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    setIsLoading(false);
  }, [editId]);

  const loadProjectForEdit = useCallback(async (projectId) => {
    try {
      const projectToEdit = await ChannelLetterInstallation.get(projectId);
      if (projectToEdit) {
        setProject(projectToEdit);
        setIsEditing(true);
      } else {
        navigate(createPageUrl("ChannelLetterInstallationProjects"));
      }
    } catch (error) {
      console.error('Error loading project:', error);
      alert('Error loading project. Please try again.');
    }
  }, [navigate]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (editId && !isLoading) {
      loadProjectForEdit(editId);
    }
  }, [editId, isLoading, loadProjectForEdit]);

  useEffect(() => {
    calculateCosts();
  }, [project.installation_type, project.qty_letters, project.letter_size, project.letter_height_inches, 
      project.installation_height_feet, project.raceway_length_feet, project.thick_hollow_walls, 
      project.parapet, project.poor_electrical_access, project.base_supplies_cost, project.extra_supplies_cost, settings]);

  const calculateCosts = () => {
    if (Object.keys(settings).length === 0) return;

    const laborRate = parseFloat(settings.install_labor_rate) || 65;
    
    // Get base rate per letter by size
    const letterSizeRates = {
      small: parseFloat(settings.install_base_rate_small) || 1.5,
      medium: parseFloat(settings.install_base_rate_medium) || 2.5,
      large: parseFloat(settings.install_base_rate_large) || 4.0,
      extra_large: parseFloat(settings.install_base_rate_extra_large) || 6.0,
    };

    let baseHours = 0;

    // Calculate base hours
    if (project.installation_type === "raceway") {
      const racewayRatePerFoot = parseFloat(settings.install_raceway_rate_per_foot) || 0.5;
      baseHours = project.raceway_length_feet * racewayRatePerFoot;
      
      // Add letter mounting time
      const letterMountingRate = parseFloat(settings.install_raceway_letter_mounting_rate) || 0.3;
      baseHours += project.qty_letters * letterMountingRate;
    } else {
      // Flush mount or halo-lit
      const baseRate = letterSizeRates[project.letter_size] || 2.5;
      baseHours = project.qty_letters * baseRate;
      
      // Halo-lit additional complexity
      if (project.installation_type === "halo_lit") {
        const haloMultiplier = parseFloat(settings.install_halo_multiplier) || 1.3;
        baseHours *= haloMultiplier;
      }
    }

    // Apply height multiplier
    let heightMultiplier = 1.0;
    if (project.installation_height_feet <= 12) {
      heightMultiplier = parseFloat(settings.install_height_0_12ft) || 1.0;
    } else if (project.installation_height_feet <= 20) {
      heightMultiplier = parseFloat(settings.install_height_12_20ft) || 1.3;
    } else if (project.installation_height_feet <= 30) {
      heightMultiplier = parseFloat(settings.install_height_20_30ft) || 1.6;
    } else {
      heightMultiplier = parseFloat(settings.install_height_30plus_ft) || 2.0;
    }
    baseHours *= heightMultiplier;

    // Apply condition multipliers
    if (project.thick_hollow_walls) {
      const wallMultiplier = parseFloat(settings.install_thick_walls_multiplier) || 1.2;
      baseHours *= wallMultiplier;
    }

    if (project.parapet) {
      const parapetMultiplier = parseFloat(settings.install_parapet_multiplier) || 1.4;
      baseHours *= parapetMultiplier;
    }

    if (project.poor_electrical_access) {
      const electricalMultiplier = parseFloat(settings.install_poor_electrical_multiplier) || 1.3;
      baseHours *= electricalMultiplier;
    }

    const laborCost = baseHours * laborRate;
    const totalSuppliesCost = project.base_supplies_cost + project.extra_supplies_cost;
    const totalCost = laborCost + totalSuppliesCost;

    setProject(prev => ({
      ...prev,
      labor_hours: baseHours,
      labor_cost: laborCost,
      total_supplies_cost: totalSuppliesCost,
      total_cost: totalCost
    }));
  };

  const saveProject = async () => {
    if (!project.project_name || !project.client_name || !project.estimate_number || !project.hyperlink) {
      alert('Please fill in all required fields (Project Name, Client Name, Estimate Number, and Project Link).');
      return;
    }

    setIsSaving(true);
    try {
      const dataToSave = {
        ...project,
        status: 'calculated'
      };

      if (isEditing && editId) {
        await ChannelLetterInstallation.update(editId, dataToSave);
        alert('Installation estimate updated successfully!');
      } else {
        await ChannelLetterInstallation.create(dataToSave);
        alert('Installation estimate created successfully!');
      }
      
      navigate(createPageUrl("ChannelLetterInstallationProjects"));
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project. Please try again.');
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Wrench className="w-8 h-8" />
              {isEditing ? 'Edit' : 'New'} Channel Letter Installation
            </h1>
            <p className="text-slate-600">Estimate channel letter installation costs</p>
          </div>
          <Button variant="outline" onClick={() => navigate(createPageUrl("ChannelLetterInstallationProjects"))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Project Info */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client_name">Client Name *</Label>
                    <Input 
                      id="client_name" 
                      value={project.client_name} 
                      onChange={(e) => setProject(prev => ({ ...prev, client_name: e.target.value }))}
                      placeholder="Enter client name" 
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="project_name">Project Name *</Label>
                    <Input 
                      id="project_name" 
                      value={project.project_name} 
                      onChange={(e) => setProject(prev => ({ ...prev, project_name: e.target.value }))}
                      placeholder="Enter project name" 
                      className="mt-1" 
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="estimate_number">Estimate Number *</Label>
                    <Input 
                      id="estimate_number" 
                      value={project.estimate_number} 
                      onChange={(e) => setProject(prev => ({ ...prev, estimate_number: e.target.value }))}
                      placeholder="e.g., INST-2024-001" 
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="hyperlink">Project Link *</Label>
                    <Input 
                      id="hyperlink" 
                      value={project.hyperlink} 
                      onChange={(e) => setProject(prev => ({ ...prev, hyperlink: e.target.value }))}
                      placeholder="https://..." 
                      className="mt-1" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Installation Details */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Installation Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="installation_type">Installation Type</Label>
                  <Select 
                    value={project.installation_type} 
                    onValueChange={(value) => setProject(prev => ({ ...prev, installation_type: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flush_mount">Flush Mount</SelectItem>
                      <SelectItem value="halo_lit">Halo-Lit</SelectItem>
                      <SelectItem value="raceway">Raceway</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {project.installation_type !== "raceway" && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="qty_letters">Quantity of Letters</Label>
                      <Input 
                        id="qty_letters" 
                        type="number" 
                        value={project.qty_letters} 
                        onChange={(e) => setProject(prev => ({ ...prev, qty_letters: parseFloat(e.target.value) || 0 }))}
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="letter_size">Letter Size Category</Label>
                      <Select 
                        value={project.letter_size} 
                        onValueChange={(value) => setProject(prev => ({ ...prev, letter_size: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small (12"-18")</SelectItem>
                          <SelectItem value="medium">Medium (18"-30")</SelectItem>
                          <SelectItem value="large">Large (30"-48")</SelectItem>
                          <SelectItem value="extra_large">Extra Large (48"+)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {project.installation_type === "raceway" && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="qty_letters">Quantity of Letters</Label>
                      <Input 
                        id="qty_letters" 
                        type="number" 
                        value={project.qty_letters} 
                        onChange={(e) => setProject(prev => ({ ...prev, qty_letters: parseFloat(e.target.value) || 0 }))}
                        className="mt-1" 
                      />
                    </div>
                    <div>
                      <Label htmlFor="raceway_length_feet">Raceway Length (feet)</Label>
                      <Input 
                        id="raceway_length_feet" 
                        type="number" 
                        value={project.raceway_length_feet} 
                        onChange={(e) => setProject(prev => ({ ...prev, raceway_length_feet: parseFloat(e.target.value) || 0 }))}
                        className="mt-1" 
                      />
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="letter_height_inches">Letter Height (inches)</Label>
                    <Input 
                      id="letter_height_inches" 
                      type="number" 
                      value={project.letter_height_inches} 
                      onChange={(e) => setProject(prev => ({ ...prev, letter_height_inches: parseFloat(e.target.value) || 0 }))}
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="installation_height_feet">Installation Height (feet)</Label>
                    <Input 
                      id="installation_height_feet" 
                      type="number" 
                      value={project.installation_height_feet} 
                      onChange={(e) => setProject(prev => ({ ...prev, installation_height_feet: parseFloat(e.target.value) || 0 }))}
                      className="mt-1" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conditions */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Installation Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="thick_hollow_walls" 
                    checked={project.thick_hollow_walls}
                    onCheckedChange={(checked) => setProject(prev => ({ ...prev, thick_hollow_walls: checked }))}
                  />
                  <Label htmlFor="thick_hollow_walls" className="cursor-pointer">
                    Thick or Hollow Walls
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="parapet" 
                    checked={project.parapet}
                    onCheckedChange={(checked) => setProject(prev => ({ ...prev, parapet: checked }))}
                  />
                  <Label htmlFor="parapet" className="cursor-pointer">
                    Parapet Installation
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="poor_electrical_access" 
                    checked={project.poor_electrical_access}
                    onCheckedChange={(checked) => setProject(prev => ({ ...prev, poor_electrical_access: checked }))}
                  />
                  <Label htmlFor="poor_electrical_access" className="cursor-pointer">
                    Poor Electrical Access
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Supplies */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Supplies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="base_supplies_cost">Base Supplies Cost</Label>
                    <Input 
                      id="base_supplies_cost" 
                      type="number" 
                      step="1"
                      value={project.base_supplies_cost} 
                      onChange={(e) => setProject(prev => ({ ...prev, base_supplies_cost: parseFloat(e.target.value) || 0 }))}
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="extra_supplies_cost">Additional Supplies</Label>
                    <Input 
                      id="extra_supplies_cost" 
                      type="number" 
                      step="1"
                      value={project.extra_supplies_cost} 
                      onChange={(e) => setProject(prev => ({ ...prev, extra_supplies_cost: parseFloat(e.target.value) || 0 }))}
                      className="mt-1" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={project.notes}
                  onChange={(e) => setProject(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any additional notes or special considerations..."
                  className="h-24"
                />
              </CardContent>
            </Card>
          </div>

          {/* Cost Summary Sidebar */}
          <div>
            <Card className="bg-white border-0 shadow-sm sticky top-8">
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-lg">Cost Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div>
                  <h4 className="font-medium text-slate-700 mb-3">Installation Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Type:</span>
                      <span className="font-medium capitalize">{project.installation_type.replace('_', ' ')}</span>
                    </div>
                    {project.installation_type !== "raceway" && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Letters:</span>
                        <span className="font-medium">{project.qty_letters}</span>
                      </div>
                    )}
                    {project.installation_type === "raceway" && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Raceway:</span>
                        <span className="font-medium">{project.raceway_length_feet} ft</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-600">Height:</span>
                      <span className="font-medium">{project.installation_height_feet} ft</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-slate-700 mb-3">Conditions</h4>
                  <div className="space-y-1 text-sm">
                    {project.thick_hollow_walls && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <span>• Thick/Hollow Walls</span>
                      </div>
                    )}
                    {project.parapet && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <span>• Parapet Installation</span>
                      </div>
                    )}
                    {project.poor_electrical_access && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <span>• Poor Electrical Access</span>
                      </div>
                    )}
                    {!project.thick_hollow_walls && !project.parapet && !project.poor_electrical_access && (
                      <span className="text-slate-500">No special conditions</span>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Labor Hours:</span>
                      <span className="font-medium">{(project.labor_hours || 0).toFixed(2)} hrs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Labor Cost:</span>
                      <span className="font-medium">${(project.labor_cost || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Supplies:</span>
                      <span className="font-medium">${(project.total_supplies_cost || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 bg-slate-800 text-white -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg">TOTAL:</span>
                    <span className="font-bold text-2xl">${(project.total_cost || 0).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={saveProject} 
              disabled={isSaving}
              className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
            >
              {isSaving ? "Saving..." : <><Save className="w-5 h-5 mr-2" />{isEditing ? 'Update' : 'Save'} Estimate</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}