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
      // In Profile.tsx useEffect
      const [fieldsRes, levelsRes] = await Promise.all([
        fetch(`/api/fields/fieldOfStudy?nocache=${Date.now()}`), // Cache busting
        fetch(`/api/fields/educationalLevels?nocache=${Date.now()}`),
      ]);

      const fieldsData = await fieldsRes.json();
      const levelsData = await levelsRes.json();

      // ✅ Check array format to avoid silent failure
      setFieldOptions(Array.isArray(fieldsData) ? fieldsData.map(f => f.name) : []);
      setLevelOptions(Array.isArray(levelsData) ? levelsData.map(l => l.level) : []);
    } catch (err: any) {
      console.error("Profile fetch error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
      router.push("/SignIn");
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

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-origin-padding bg-gradient-to-b from-gray-50 to-gray-100">
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
                    {/* Documents Section (if needed) */}
                  </CardContent>
                </TabsContent>
                {/* Preferences Tab */}
                <TabsContent value="preferences" className="m-0">
                  <CardHeader>
                    <CardTitle>Preferences</CardTitle>
                    <CardDescription>Manage your notification and content preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/** Preference toggles **/}
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