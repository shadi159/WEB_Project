// pages/Profile.tsx
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
import Logo from "../app/components/Logo"; 

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

// Professional Loading Component
const ProfileLoadingScreen = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-8">
        {/* Logo Container with Animation */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-teal-600 rounded-2xl flex items-center justify-center animate-pulse">
              <Logo className="w-20 h-20 animate-pulse"/>
            </div>
            
            {/* Animated Ring */}
            <div className="absolute inset-0 rounded-2xl border-4 border-blue-200 animate-spin opacity-20"></div>
            <div className="absolute inset-2 rounded-xl border-2 border-teal-200 animate-ping opacity-30"></div>
          </div>
        </div>
        
        {/* Loading Text */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-secondary animate-fade-in">
            Loading Your Profile
          </h2>
          <p className="text-secondary animate-fade-in-delay">
            Please wait while we fetch your information...
          </p>
        </div>
        
        {/* Progress Indicators */}
        <div className="space-y-3">
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-64 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-teal-600 rounded-full animate-progress"></div>
          </div>
        </div>
      </div>
      
      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in-delay {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        .animate-fade-in-delay {
          animation: fade-in-delay 0.6s ease-out 0.3s both;
        }
        
        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

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

  // Fetch user data on mount
  useEffect(() => {
    const token = localStorage.getItem("token");

    // Redirect if no token
    if (!token) {
      toast({ title: "Please sign in", description: "Redirecting..." });
      router.push("/SignIn");
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch profile
        const profileRes = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (profileRes.status === 401) throw new Error("Unauthorized");

        const profileData = await profileRes.json();
        setProfile(profileData.user);

        // Fetch dropdown options
        const [fieldsRes, levelsRes] = await Promise.all([
          fetch(`/api/fields/fieldOfStudy?nocache=${Date.now()}`),
          fetch(`/api/fields/educationalLevels?nocache=${Date.now()}`),
        ]);

        const fieldsData = await fieldsRes.json();
        const levelsData = await levelsRes.json();

        setFieldOptions(Array.isArray(fieldsData) ? fieldsData.map(f => f.name) : []);
        setLevelOptions(Array.isArray(levelsData) ? levelsData.map(l => l.level) : []);
      } catch (err: any) {
        console.error("Profile fetch error:", err);
        toast({ title: "Error", description: err.message, variant: "destructive" });
        router.push("/SignIn");
      } finally {
        // Add a small delay to show the loading animation
        setTimeout(() => {
          setLoading(false);
        }, 1000);
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
      const token = localStorage.getItem("token");
      if (!token) {
        toast({ title: "Error", description: "Session expired. Please sign in again.", variant: "destructive" });
        router.push("/SignIn");
        return;
      }

      // 1. Initial save request
      const saveRes = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });
      
      if (!saveRes.ok) {
        const errorData = await saveRes.json();
        throw new Error(errorData.message || "Failed to update profile");
      }

      // 2. Force refresh with cache-busting
      const refreshRes = await fetch(`/api/profile?ts=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!refreshRes.ok) {
        console.warn("Refresh failed, using original response data");
        const saveData = await saveRes.json();
        setProfile(saveData.user);
      } else {
        const refreshData = await refreshRes.json();
        setProfile(refreshData.user);
      }

      setIsEditing(false);
      toast({ title: "Saved", description: "Profile updated successfully" });
    } catch (err: any) {
      console.error("Save error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Show loading screen while fetching data
  if (loading) {
    return <ProfileLoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-origin-padding bg-background">
      <Navbar />
      <main className="container py-6 px-6">
        <div className="mb-8">
          <h1 className="font-bold text-3xl mb-2">User Profile</h1>
          <p className="text-muted-foreground">Manage your personal information and preferences</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Card */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <Avatar className="w-24 h-24 mx-auto">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-3xl bg-purple-500 text-white">
                    {profile?.firstName.charAt(0)}{profile?.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="mt-4">{profile?.firstName} {profile?.lastName}</CardTitle>
                <CardDescription>{profile?.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">From:</span>
                    <span className="font-medium">{profile?.country}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Destination:</span>
                    <span className="font-medium">{profile?.destination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Education Level:</span>
                    <span className="font-medium">{profile?.educationalLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Field:</span>
                    <span className="font-medium">{profile?.fieldOfStudy}</span>
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
                      <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gradient-to-r from-blue-50 to-teal-50 p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-blue-300">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-teal-500/5"></div>
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/10 to-teal-400/10 rounded-full -mr-10 -mt-10"></div>
                        
                        {/* Content */}
                        <div className="relative">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg text-gray-800 mb-2">
                                Education System Comparison
                              </h3>
                              <p className="text-sm text-gray-600 leading-relaxed">
                                Get detailed insights comparing education systems between your home and destination country. 
                                Understand requirements, equivalencies, and pathways.
                              </p>
                            </div>
                            <div className="ml-4 p-2 bg-white rounded-lg shadow-sm">
                              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                                Free Tool
                              </span>
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                                Instant Results
                              </span>
                            </div>
                            
                            <Button
                              className="bg-gradient-to-r from-blue-800 to-teal-500 hover:from-blue-700 hover:to-teal-700 text-white font-medium px-6 py-2 rounded-lg shadow-sm transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                              onClick={() => router.push('/Compare-education')}
                              disabled={isEditing}
                            >
                              <span className="flex items-center space-x-2">
                                <span>Compare Now</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                              </span>
                            </Button>
                          </div>
                        </div>
                      </div>
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
                        checked={profile?.preferences.emailNotifications}
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
                        checked={profile?.preferences.appNotifications}
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
                        checked={profile?.preferences.resourceRecommendations}
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
                        checked={profile?.preferences.peerConnections}
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
                      className="bg-blue-500 hover:bg-teal-500"
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