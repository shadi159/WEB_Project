import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import { Input } from "../app/components/ui/input";
import { Separator } from "../app/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../app/components/ui/tabs";
import { Textarea } from "../app/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../app/components/ui/avatar";
import { Label } from "../app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../app/components/ui/select";
import { Switch } from "../app/components/ui/switch";
import { useToast } from "../app/components/ui/use-toast";
import CountrySelect from "../app/components/ui/CountrySelect";
import Navbar from "../app/components/Navbar";
import { useRouter } from "next/navigation";

const Profile = () => {
  const router = useRouter();
  const { toast } = useToast();

  const defaultUser = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    destination: "",
    educationalLevel: "",
    fieldOfStudy: "",
    bio: "",
    preferences: {
      emailNotifications: false,
      appNotifications: false,
      resourceRecommendations: false,
      peerConnections: false,
    },
  };

  const [isEditing, setIsEditing] = useState(false);
  const [Profile, setProfile] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : defaultUser;
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      toast({ title: "Please sign in", description: "Redirecting to sign in..." });
      router.push("/SignIn");
    }
  }, [router, toast]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setProfile((prev: any) => ({ ...prev, [name]: value }));
  };

  const handlePreferenceChange = (preference: keyof typeof Profile.preferences) => {
    setProfile((prev: any) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [preference]: !prev.preferences[preference],
      },
    }));
  };

  const handleSaveProfile = () => {
    localStorage.setItem("user", JSON.stringify(Profile));
    setIsEditing(false);
    toast({ title: "Profile updated", description: "Your Profile information has been saved." });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      
      <main className="container py-6">
        <div className="mb-8">
          <h1 className="font-bold text-3xl mb-2">User Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal information and preferences
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <Avatar className="w-24 h-24 mx-auto">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-3xl bg-purple-500 text-white">
                    {Profile.firstName.charAt(0)}{Profile.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="mt-4">{Profile.firstName} {Profile.lastName}</CardTitle>
                <CardDescription>{Profile.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">From:</span>
                    <span className="font-medium">{Profile.country}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Destination:</span>
                    <span className="font-medium">{Profile.destination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Education Level:</span>
                    <span className="font-medium">{Profile.educationalLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Field:</span>
                    <span className="font-medium">{Profile.fieldOfStudy}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant={isEditing ? "outline" : "default"}
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? "Cancel Editing" : "Edit Profile"}
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <div className="md:col-span-2">
            <Tabs defaultValue="personal">
              <TabsList className="mb-4">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="academic">Academic Info</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
              </TabsList>
              
              <Card>
                <TabsContent value="personal" className="m-0">
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>
                      Update your personal details and contact information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={Profile.firstName}
                          onChange={handleProfileChange}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={Profile.lastName}
                          onChange={handleProfileChange}
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
                        value={Profile.email}
                        onChange={handleProfileChange}
                        disabled={!isEditing}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={Profile.phone}
                        onChange={handleProfileChange}
                        disabled={!isEditing}
                      />
                    </div>
                    
                    <div className="space-y-2">
                    <Label htmlFor="country">Home Country</Label>
                      <CountrySelect
                        id="country"
                        value={Profile.country}
                        onChange={(value) => handleSelectChange("country", value)}
                        disabled={!isEditing}
                    />

                    </div>
                    
                    <div className="space-y-2">
                    <Label htmlFor="destination">Destination Country</Label>
                      <CountrySelect
                        id="destination"
                        value={Profile.destination}
                        onChange={(value) => handleSelectChange("destination", value)}
                        disabled={!isEditing}
                    />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        name="bio"
                        value={Profile.bio}
                        onChange={handleProfileChange}
                        disabled={!isEditing}
                        rows={4}
                      />
                    </div>
                  </CardContent>
                </TabsContent>
                
                <TabsContent value="academic" className="m-0">
                  <CardHeader>
                    <CardTitle>Academic Information</CardTitle>
                    <CardDescription>
                      Manage your educational details and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="educationalLevel">Educational Level</Label>
                      <Select
                        disabled={!isEditing}
                        defaultValue={Profile.educationalLevel}
                        onValueChange={(value) => handleSelectChange("educationalLevel", value)}
                      >
                        <SelectTrigger id="educationalLevel">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="High School">High School</SelectItem>
                          <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                          <SelectItem value="Graduate">Graduate</SelectItem>
                          <SelectItem value="PhD">PhD</SelectItem>
                          <SelectItem value="Professional">Professional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="fieldOfStudy">Field of Study</Label>
                      <Select
                        disabled={!isEditing}
                        defaultValue={Profile.fieldOfStudy}
                        onValueChange={(value) => handleSelectChange("fieldOfStudy", value)}
                      >
                        <SelectTrigger id="fieldOfStudy">
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Computer Science">Computer Science</SelectItem>
                          <SelectItem value="Business">Business</SelectItem>
                          <SelectItem value="Engineering">Engineering</SelectItem>
                          <SelectItem value="Medicine">Medicine</SelectItem>
                          <SelectItem value="Arts">Arts</SelectItem>
                          <SelectItem value="Social Sciences">Social Sciences</SelectItem>
                          <SelectItem value="Natural Sciences">Natural Sciences</SelectItem>
                          <SelectItem value="Education">Education</SelectItem>
                          <SelectItem value="Law">Law</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <h3 className="font-medium">Academic Documents</h3>
                      <p className="text-sm text-muted-foreground">Upload and manage your academic documents</p>
                      
                      <div className="space-y-2 mt-4">
                        <div className="flex justify-between items-center p-3 border rounded-md">
                          <div>
                            <p className="font-medium">Academic Transcript</p>
                            <p className="text-xs text-muted-foreground">Uploaded 2 months ago</p>
                          </div>
                          <Button variant="outline" size="sm" disabled={!isEditing}>View</Button>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 border rounded-md">
                          <div>
                            <p className="font-medium">Language Proficiency Certificate</p>
                            <p className="text-xs text-muted-foreground">Uploaded 1 month ago</p>
                          </div>
                          <Button variant="outline" size="sm" disabled={!isEditing}>View</Button>
                        </div>
                        
                        <Button className="w-full mt-2" variant="outline" disabled={!isEditing}>
                          Upload New Document
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </TabsContent>
                
                <TabsContent value="preferences" className="m-0">
                  <CardHeader>
                    <CardTitle>Preferences</CardTitle>
                    <CardDescription>
                      Manage your notification and content preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="font-medium">Email Notifications</h4>
                          <p className="text-sm text-muted-foreground">
                            Receive email updates about your journey progress
                          </p>
                        </div>
                        <Switch
                          disabled={!isEditing}
                          checked={Profile.preferences.emailNotifications}
                          onCheckedChange={() => handlePreferenceChange("emailNotifications")}
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="font-medium">App Notifications</h4>
                          <p className="text-sm text-muted-foreground">
                            Get notifications within the application
                          </p>
                        </div>
                        <Switch
                          disabled={!isEditing}
                          checked={Profile.preferences.appNotifications}
                          onCheckedChange={() => handlePreferenceChange("appNotifications")}
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="font-medium">Resource Recommendations</h4>
                          <p className="text-sm text-muted-foreground">
                            Receive personalized resource recommendations
                          </p>
                        </div>
                        <Switch
                          disabled={!isEditing}
                          checked={Profile.preferences.resourceRecommendations}
                          onCheckedChange={() => handlePreferenceChange("resourceRecommendations")}
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="font-medium">Peer Connections</h4>
                          <p className="text-sm text-muted-foreground">
                            Allow others to connect with you for peer support
                          </p>
                        </div>
                        <Switch
                          disabled={!isEditing}
                          checked={Profile.preferences.peerConnections}
                          onCheckedChange={() => handlePreferenceChange("peerConnections")}
                        />
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Data & Privacy</h4>
                      <p className="text-sm text-muted-foreground">
                        Manage your account data and privacy settings
                      </p>
                      
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" disabled={!isEditing}>
                          Download My Data
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive" disabled={!isEditing}>
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </TabsContent>
                
                {isEditing && (
                  <CardFooter className="flex justify-end gap-2 border-t pt-6">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button 
                      className="bg-blue-500 hover:bg-purple-500"
                      onClick={handleSaveProfile}
                    >
                      Save Changes
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
};

export default Profile;