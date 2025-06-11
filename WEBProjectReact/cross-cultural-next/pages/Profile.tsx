// pages/Profile.tsx - Enhanced with debugging and better error handling
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import { Input } from "../app/components/ui/input";
import { Label } from "../app/components/ui/label";
import { Textarea } from "../app/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../app/components/ui/avatar";
import CountrySelect from "../app/components/ui/CountrySelect";
import { Switch } from "../app/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../app/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../app/components/ui/select";
import { Separator } from "../app/components/ui/separator";
import { useToast } from "../app/components/ui/use-toast";
import Navbar from "../app/components/Navbar";

interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  destination?: string;
  educationalLevel: string;
  fieldOfStudy?: string;
  bio?: string;
  preferences: {
    emailNotifications: boolean;
    appNotifications: boolean;
    resourceRecommendations: boolean;
    peerConnections: boolean;
  };
}

export default function Profile() {
  const router = useRouter();
  const { toast } = useToast();

  // Local state for the fetched profile
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldOptions, setFieldOptions] = useState<string[]>([]);
  const [levelOptions, setLevelOptions] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>({});

  // Enhanced token validation
  const validateToken = (token: string | null): boolean => {
    if (!token) {
      console.log("❌ No token found");
      return false;
    }

    try {
      // Basic JWT format check
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.log("❌ Invalid JWT format");
        return false;
      }

      // Decode payload to check expiration
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Date.now() / 1000;
      
      if (payload.exp && payload.exp < currentTime) {
        console.log("❌ Token expired");
        return false;
      }

      console.log("✅ Token is valid");
      setDebugInfo((prev: any) => ({ ...prev, tokenValid: true, tokenPayload: payload }));
      return true;
    } catch (error) {
      console.log("❌ Token validation error:", error);
      return false;
    }
  };

  // Enhanced fetch with better error handling
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("token");
    
    if (!validateToken(token)) {
      throw new Error("INVALID_TOKEN");
    }

    console.log(`🌐 Fetching: ${url}`);
    console.log(`🎫 Using token: ${token?.substring(0, 20)}...`);

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    console.log(`📊 Response status: ${response.status}`);
    
    if (response.status === 401) {
      console.log("❌ 401 Unauthorized - clearing auth data");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("isLoggedIn");
      throw new Error("UNAUTHORIZED");
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ HTTP Error ${response.status}:`, errorText);
      throw new Error(`HTTP_${response.status}: ${errorText}`);
    }

    return response;
  };

  // Fetch user data on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    
    console.log("🔄 Profile component mounted");
    console.log("🎫 Token exists:", !!token);
    console.log("👤 User data exists:", !!user);

    // Set initial debug info
    setDebugInfo({
      tokenExists: !!token,
      userExists: !!user,
      timestamp: new Date().toISOString()
    });

    // Redirect if no token
    if (!token) {
      console.log("❌ No token found - redirecting to signin");
      toast({ title: "Please sign in", description: "Redirecting..." });
      router.push("/SignIn");
      return;
    }

    // Validate token before proceeding
    if (!validateToken(token)) {
      console.log("❌ Invalid token - redirecting to signin");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      toast({ title: "Session expired", description: "Please sign in again" });
      router.push("/SignIn");
      return;
    }

    const fetchData = async () => {
      try {
        console.log("📥 Starting profile fetch...");
        
        // Fetch profile with enhanced error handling
        const profileRes = await fetchWithAuth("/api/profile");
        const profileData = await profileRes.json();
        
        console.log("✅ Profile data received:", profileData);
        setProfile(profileData.user);

        // Update debug info
        setDebugInfo((prev: any) => ({ 
          ...prev, 
          profileLoaded: true,
          userId: profileData.user?._id 
        }));

        // Fetch dropdown options
        try {
          console.log("📥 Fetching dropdown options...");
          const [fieldsRes, levelsRes] = await Promise.all([
            fetch(`/api/fields/fieldOfStudy?nocache=${Date.now()}`),
            fetch(`/api/fields/educationalLevels?nocache=${Date.now()}`),
          ]);

          const fieldsData = await fieldsRes.json();
          const levelsData = await levelsRes.json();

          console.log("📋 Fields data:", fieldsData);
          console.log("📋 Levels data:", levelsData);

          // Check array format to avoid silent failure
          setFieldOptions(Array.isArray(fieldsData) ? fieldsData.map(f => f.name) : []);
          setLevelOptions(Array.isArray(levelsData) ? levelsData.map(l => l.level) : []);
          
          setDebugInfo((prev: any) => ({ 
            ...prev, 
            dropdownsLoaded: true,
            fieldCount: fieldsData?.length || 0,
            levelCount: levelsData?.length || 0
          }));
        } catch (dropdownError) {
          console.warn("⚠️ Failed to load dropdown options:", dropdownError);
          // Continue without dropdowns - not critical
        }

      } catch (err: any) {
        console.error("❌ Profile fetch error:", err);
        
        if (err.message === "INVALID_TOKEN" || err.message === "UNAUTHORIZED") {
          toast({ title: "Session expired", description: "Please sign in again", variant: "destructive" });
          router.push("/SignIn");
        } else {
          toast({ title: "Error", description: err.message, variant: "destructive" });
          setDebugInfo((prev: any) => ({ ...prev, error: err.message }));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, toast]);

  // Handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleSelect = (field: keyof UserProfile, value: string) => {
    setProfile((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handlePrefChange = (key: keyof UserProfile['preferences']) => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            preferences: {
              ...prev.preferences,
              [key]: !prev.preferences[key]
            }
          }
        : prev
    );
  };

  const saveProfile = async () => {
  if (!profile) return;
  setSaving(true);
  
  try {
    console.log("💾 Saving profile:", profile);
    
    // 🔧 FIX: Only send specific profile fields (password not included in UserProfile interface)
    const profilePayload = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone,
      country: profile.country,
      destination: profile.destination,
      educationalLevel: profile.educationalLevel,
      fieldOfStudy: profile.fieldOfStudy,
      bio: profile.bio,
      preferences: profile.preferences
      // ✅ Password is not included in UserProfile interface, so it won't be sent
    };
    
    console.log("📤 Sending payload (without password):", profilePayload);
    
    const response = await fetchWithAuth("/api/profile", {
      method: "PUT",
      body: JSON.stringify(profilePayload), // Use profilePayload instead of profile
    });
    
    const data = await response.json();
    console.log("✅ Profile saved:", data);

    // Force refresh with cache-busting
    const refreshRes = await fetchWithAuth(`/api/profile?ts=${Date.now()}`);
    const refreshData = await refreshRes.json();
    
    setProfile(refreshData.user);
    setIsEditing(false);
    toast({ title: "Saved", description: "Profile updated successfully" });
    
  } catch (err: any) {
    console.error("❌ Save error:", err);
    
    if (err.message === "INVALID_TOKEN" || err.message === "UNAUTHORIZED") {
      toast({ title: "Session expired", description: "Please sign in again", variant: "destructive" });
      router.push("/SignIn");
    } else {
      toast({
        title: "Error",
        description: err.message || "Failed to save changes",
        variant: "destructive",
      });
    }
  } finally {
    setSaving(false);
  }
};

  // Show loading with debug info
  if (loading) {
    return (
      <div className="min-h-screen bg-origin-padding bg-background">
        <Navbar />
        <main className="container py-6 px-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Loading Profile...</h1>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            
            {/* Debug Info Card */}
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-sm">Debug Information</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-left space-y-1">
                <p>Token exists: {debugInfo.tokenExists ? '✅' : '❌'}</p>
                <p>Token valid: {debugInfo.tokenValid ? '✅' : '❌'}</p>
                <p>User data exists: {debugInfo.userExists ? '✅' : '❌'}</p>
                <p>Profile loaded: {debugInfo.profileLoaded ? '✅' : '⏳'}</p>
                <p>Dropdowns loaded: {debugInfo.dropdownsLoaded ? '✅' : '⏳'}</p>
                {debugInfo.error && <p className="text-red-500">Error: {debugInfo.error}</p>}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-origin-padding bg-background">
      <Navbar />
      <main className="container py-6 px-6">
        <div className="mb-8">
          <h1 className="font-bold text-3xl mb-2">User Profile</h1>
          <p className="text-muted-foreground">Manage your personal information and preferences</p>
        </div>
        
        {/* Debug Info Toggle (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm">Debug Information</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1">
              <p>User ID: {profile?._id || 'Not loaded'}</p>
              <p>Token valid: {debugInfo.tokenValid ? '✅' : '❌'}</p>
              <p>Profile loaded: {debugInfo.profileLoaded ? '✅' : '❌'}</p>
              <p>Field options: {fieldOptions.length}</p>
              <p>Level options: {levelOptions.length}</p>
              {debugInfo.error && <p className="text-red-500">Last error: {debugInfo.error}</p>}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Card */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <Avatar className="w-24 h-24 mx-auto">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-3xl bg-purple-500 text-white">
                    {profile?.firstName?.charAt(0)}{profile?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="mt-4">{profile?.firstName} {profile?.lastName}</CardTitle>
                <CardDescription>{profile?.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">From:</span>
                    <span className="font-medium">{profile?.country || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Destination:</span>
                    <span className="font-medium">{profile?.destination || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Education Level:</span>
                    <span className="font-medium">{profile?.educationalLevel || 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Field:</span>
                    <span className="font-medium">{profile?.fieldOfStudy || 'Not set'}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={isEditing ? "outline" : "default"}
                  onClick={() => setIsEditing(!isEditing)}
                  disabled={saving}
                >
                  {isEditing ? "Cancel Editing" : "Edit Profile"}
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          {/* Edit Form */}
          <div className="md:col-span-2">
            <Tabs defaultValue="personal">
              <TabsList className="mb-4">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="academic">Academic Info</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
              </TabsList>
              <Card>
                {/* Personal Tab */}
                <TabsContent value="personal" className="m-0">
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your personal details and contact information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={profile?.firstName || ""}
                          onChange={handleChange}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={profile?.lastName || ""}
                          onChange={handleChange}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={profile?.email || ""}
                        onChange={handleChange}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={profile?.phone || ""}
                        onChange={handleChange}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Home Country</Label>
                      <CountrySelect
                        id="country"
                        value={profile?.country || ""}
                        onChange={(v) => handleSelect("country", v)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="destination">Destination Country</Label>
                      <CountrySelect
                        id="destination"
                        value={profile?.destination || ""}
                        onChange={(v) => handleSelect("destination", v)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        name="bio"
                        value={profile?.bio || ""}
                        onChange={handleChange}
                        disabled={!isEditing}
                        rows={4}
                      />
                    </div>
                    <div className="mt-6">
                      <h3 className="font-medium mb-2">Education System Comparison</h3>
                      <Button
                        className="w-full"
                        variant="default"
                        onClick={() => router.push('/Compare-education')}
                        disabled={isEditing}
                      >
                        Compare Education Systems
                      </Button>
                      <p className="text-sm text-muted-foreground mt-1">
                        Compare education systems between your home and destination country
                      </p>
                    </div>
                  </CardContent>
                </TabsContent>
                
                {/* Academic Tab */}
                <TabsContent value="academic" className="m-0">
                  <CardHeader>
                    <CardTitle>Academic Information</CardTitle>
                    <CardDescription>Manage your educational details and preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="educationalLevel">Educational Level</Label>
                      <Select
                        disabled={!isEditing}
                        value={profile?.educationalLevel}
                        onValueChange={(v) => handleSelect("educationalLevel", v)}
                      >
                        <SelectTrigger id="educationalLevel">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-auto bg-gray-50">
                          {levelOptions.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fieldOfStudy">Field of Study</Label>
                      <Select
                        disabled={!isEditing}
                        value={profile?.fieldOfStudy}
                        onValueChange={(v) => handleSelect("fieldOfStudy", v)}
                      >
                        <SelectTrigger id="fieldOfStudy">
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-auto bg-gray-50">
                          {fieldOptions.map((field) => (
                            <SelectItem key={field} value={field}>
                              {field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                  </CardContent>
                </TabsContent>
                
                {/* Preferences Tab */}
                <TabsContent value="preferences" className="m-0">
                  <CardHeader>
                    <CardTitle>Preferences</CardTitle>
                    <CardDescription>Manage your notification and content preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="font-medium">Email Notifications</h4>
                        <p className="text-sm text-muted-foreground">Receive email updates</p>
                      </div>
                      <Switch
                        disabled={!isEditing}
                        checked={profile?.preferences?.emailNotifications}
                        onCheckedChange={() => handlePrefChange("emailNotifications")}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="font-medium">App Notifications</h4>
                        <p className="text-sm text-muted-foreground">Receive in-app updates</p>
                      </div>
                      <Switch
                        disabled={!isEditing}
                        checked={profile?.preferences?.appNotifications}
                        onCheckedChange={() => handlePrefChange("appNotifications")}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="font-medium">Resource Recommendations</h4>
                        <p className="text-sm text-muted-foreground">Get personalized resources</p>
                      </div>
                      <Switch
                        disabled={!isEditing}
                        checked={profile?.preferences?.resourceRecommendations}
                        onCheckedChange={() => handlePrefChange("resourceRecommendations")}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="font-medium">Peer Connections</h4>
                        <p className="text-sm text-muted-foreground">Allow peer support</p>
                      </div>
                      <Switch
                        disabled={!isEditing}
                        checked={profile?.preferences?.peerConnections}
                        onCheckedChange={() => handlePrefChange("peerConnections")}
                      />
                    </div>
                  </CardContent>
                </TabsContent>
                
                {/* Save/Cancel Footer */}
                {isEditing && (
                  <CardFooter className="flex justify-end gap-2 border-t pt-6">
                    <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                      Cancel
                    </Button>
                    <Button
                      className="bg-blue-500 hover:bg-purple-500"
                      onClick={saveProfile}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}