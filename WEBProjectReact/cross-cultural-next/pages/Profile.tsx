"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../app/components/ui/card"
import { Button } from "../app/components/ui/button"
import { Input } from "../app/components/ui/input"
import { Label } from "../app/components/ui/label"
import { Textarea } from "../app/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "../app/components/ui/avatar"
import { Badge } from "../app/components/ui/badge"
import CountrySelect from "../app/components/ui/CountrySelect"
import { Switch } from "../app/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../app/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../app/components/ui/select"
import { useToast } from "../app/components/ui/use-toast"
import {
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  BookOpen,
  Settings,
  Edit3,
  Save,
  X,
  Bell,
  Users,
  Lightbulb,
  MessageCircle,
  BarChart3,
  Globe,
  ArrowRight,
} from "lucide-react"
import Navbar from "../app/components/Navbar"
import Logo from "../app/components/Logo"

interface UserProfile {
  _id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  country: string
  destination?: string
  educationalLevel: string
  fieldOfStudy?: string
  bio?: string
  preferences: {
    emailNotifications: boolean
    appNotifications: boolean
    resourceRecommendations: boolean
    peerConnections: boolean
  }
}

// Professional Loading Component
const ProfileLoadingScreen = () => {
  return (
    <div
      className="min-h-screen flex items-center justify-center transition-colors duration-300"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div className="text-center space-y-8">
        {/* Logo Container with Animation */}
        <div className="flex justify-center">
          <div className="relative">
            <div
              className="w-40 h-20 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              <Logo />
            </div>
            {/* Animated Rings */}
            <div
              className="absolute inset-0 rounded-2xl border-4 animate-spin opacity-20"
              style={{ borderColor: "var(--color-primary)" }}
            ></div>
            <div
              className="absolute inset-2 rounded-xl border-2 animate-ping opacity-30"
              style={{ borderColor: "var(--color-accent)" }}
            ></div>
          </div>
        </div>
        {/* Loading Text */}
        <div className="space-y-4">
          <h2
            className="text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent"
            style={{
              backgroundImage: `linear-gradient(to right, var(--color-primary), var(--color-accent))`,
            }}
          >
            Loading Your Profile
          </h2>
          <p className="text-lg" style={{ color: "var(--color-text-light)" }}>
            Please wait while we fetch your information...
          </p>
        </div>
        {/* Progress Indicators */}
        <div className="space-y-6">
          <div className="flex justify-center space-x-2">
            <div
              className="w-3 h-3 rounded-full animate-bounce"
              style={{ backgroundColor: "var(--color-primary)" }}
            ></div>
            <div
              className="w-3 h-3 rounded-full animate-bounce"
              style={{
                backgroundColor: "var(--color-accent)",
                animationDelay: "0.1s",
              }}
            ></div>
            <div
              className="w-3 h-3 rounded-full animate-bounce"
              style={{
                backgroundColor: "var(--color-primary)",
                animationDelay: "0.2s",
              }}
            ></div>
          </div>
          {/* Progress Bar */}
          <div className="w-80 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-border)" }}>
            <div
              className="h-full rounded-full animate-pulse"
              style={{
                background: `linear-gradient(to right, var(--color-primary), var(--color-accent))`,
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Profile() {
  const router = useRouter()
  const { toast } = useToast()
  // Local state for the fetched profile
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fieldOptions, setFieldOptions] = useState<string[]>([])
  const [levelOptions, setLevelOptions] = useState<string[]>([])

  // Fetch user data on mount
  useEffect(() => {
    const token = localStorage.getItem("token")
    // Redirect if no token
    if (!token) {
      toast({ title: "Please sign in", description: "Redirecting..." })
      router.push("/SignIn")
      return
    }

    const fetchData = async () => {
      try {
        // Fetch profile
        const profileRes = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (profileRes.status === 401) throw new Error("Unauthorized")
        const profileData = await profileRes.json()
        setProfile(profileData.user)

        // Fetch dropdown options
        const [fieldsRes, levelsRes] = await Promise.all([
          fetch(`/api/fields/fieldOfStudy?nocache=${Date.now()}`),
          fetch(`/api/fields/educationalLevels?nocache=${Date.now()}`),
        ])

        const fieldsData = await fieldsRes.json()
        const levelsData = await levelsRes.json()

        setFieldOptions(Array.isArray(fieldsData) ? fieldsData.map((f) => f.name) : [])
        setLevelOptions(Array.isArray(levelsData) ? levelsData.map((l) => l.level) : [])
      } catch (err: any) {
        console.error("Profile fetch error:", err)
        toast({ title: "Error", description: err.message, variant: "destructive" })
        router.push("/SignIn")
      } finally {
        // Add a small delay to show the loading animation
        setTimeout(() => {
          setLoading(false)
        }, 1000)
      }
    }

    fetchData()
  }, [router, toast])

  // Handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProfile((prev) => (prev ? { ...prev, [name]: value } : prev))
  }

  const handleSelect = (field: keyof UserProfile, value: string) => {
    setProfile((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  const handlePrefChange = (key: keyof UserProfile["preferences"]) => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            preferences: {
              ...prev.preferences,
              [key]: !prev.preferences[key],
            },
          }
        : prev,
    )
  }

  const saveProfile = async () => {
    if (!profile) return
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        toast({
          title: "Error",
          description: "Session expired. Please sign in again.",
          variant: "destructive",
        })
        router.push("/SignIn")
        return
      }

      // 1. Initial save request
      const saveRes = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      })

      if (!saveRes.ok) {
        const errorData = await saveRes.json()
        throw new Error(errorData.message || "Failed to update profile")
      }

      // 2. Force refresh with cache-busting
      const refreshRes = await fetch(`/api/profile?ts=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!refreshRes.ok) {
        console.warn("Refresh failed, using original response data")
        const saveData = await saveRes.json()
        setProfile(saveData.user)
      } else {
        const refreshData = await refreshRes.json()
        setProfile(refreshData.user)
      }

      setIsEditing(false)
      toast({ title: "Saved", description: "Profile updated successfully" })
    } catch (err: any) {
      console.error("Save error:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to save changes",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Show loading screen while fetching data
  if (loading) {
    return <ProfileLoadingScreen />
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: "var(--color-background)" }}>
      <Navbar />
      <main className="container py-8 px-4 md:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            <div>
              <Badge
                variant="outline"
                className="mb-4 px-4 py-2 text-sm font-medium transition-colors duration-300"
                style={{
                  backgroundColor: "var(--color-primary)",
                  color: "white",
                  borderColor: "var(--color-primary)",
                }}
              >
                <User className="w-4 h-4 mr-2" />
                Your Profile
              </Badge>
              <h1
                className="text-4xl font-bold bg-gradient-to-r bg-clip-text text-transparent mb-2"
                style={{
                  backgroundImage: `linear-gradient(to right, var(--color-primary), var(--color-accent))`,
                }}
              >
                Profile Management
              </h1>
              <p className="text-xl" style={{ color: "var(--color-text-light)" }}>
                Manage your personal information and preferences
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-4">
          {/* Profile Summary Card */}
          <div className="lg:col-span-1">
            <Card
              className="border shadow-lg backdrop-blur-sm sticky top-8 transition-colors duration-300"
              style={{
                backgroundColor: "var(--color-background)",
                borderColor: "var(--color-border)",
              }}
            >
              <CardHeader className="text-center pb-4">
                <div className="relative">
                  <Avatar className="w-24 h-24 mx-auto mb-4 ring-4" style={{ borderColor: "var(--color-border)" }}>
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback className="text-2xl text-white" style={{ backgroundColor: "var(--color-primary)" }}>
                      {profile?.firstName.charAt(0)}
                      {profile?.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <div
                      className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "var(--color-primary)" }}
                    >
                      <Edit3 className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <CardTitle className="text-xl" style={{ color: "var(--color-text)" }}>
                  {profile?.firstName} {profile?.lastName}
                </CardTitle>
                <CardDescription className="flex items-center justify-center mt-2">
                  <Mail className="w-4 h-4 mr-2" />
                  {profile?.email}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: "var(--color-primary)20" }}
                  >
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" style={{ color: "var(--color-primary)" }} />
                      <span className="text-sm" style={{ color: "var(--color-text-light)" }}>
                        From
                      </span>
                    </div>
                    <span className="font-medium text-sm" style={{ color: "var(--color-text)" }}>
                      {profile?.country}
                    </span>
                  </div>
                  <div
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: "var(--color-accent)20" }}
                  >
                    <div className="flex items-center">
                      <Globe className="w-4 h-4 mr-2" style={{ color: "var(--color-accent)" }} />
                      <span className="text-sm" style={{ color: "var(--color-text-light)" }}>
                        To
                      </span>
                    </div>
                    <span className="font-medium text-sm" style={{ color: "var(--color-text)" }}>
                      {profile?.destination || "Not set"}
                    </span>
                  </div>
                  <div
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: "#10b98120" }}
                  >
                    <div className="flex items-center">
                      <GraduationCap className="w-4 h-4 text-green-600 mr-2" />
                      <span className="text-sm" style={{ color: "var(--color-text-light)" }}>
                        Level
                      </span>
                    </div>
                    <span className="font-medium text-sm" style={{ color: "var(--color-text)" }}>
                      {profile?.educationalLevel}
                    </span>
                  </div>
                  <div
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: "#f9731620" }}
                  >
                    <div className="flex items-center">
                      <BookOpen className="w-4 h-4 text-orange-600 mr-2" />
                      <span className="text-sm" style={{ color: "var(--color-text-light)" }}>
                        Field
                      </span>
                    </div>
                    <span className="font-medium text-sm" style={{ color: "var(--color-text)" }}>
                      {profile?.fieldOfStudy || "Not set"}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className={`w-full transition-all duration-300 ${isEditing ? "bg-red-500 hover:bg-red-600" : ""}`}
                  style={
                    !isEditing
                      ? {
                          background: `linear-gradient(to right, var(--color-primary), var(--color-accent))`,
                          color: "white",
                          border: "none",
                        }
                      : {}
                  }
                  onClick={() => setIsEditing(!isEditing)}
                  disabled={saving}
                >
                  {isEditing ? (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Cancel Editing
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Profile
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="personal" className="space-y-6">
              <TabsList
                className="grid w-full grid-cols-3 backdrop-blur-sm border shadow-sm transition-colors duration-300"
                style={{
                  backgroundColor: "var(--color-background)",
                  borderColor: "var(--color-border)",
                }}
              >
                <TabsTrigger
                  value="personal"
                  className="flex items-center space-x-2 transition-colors duration-300"
                  style={{ color: "var(--color-text)" }}
                >
                  <User className="w-4 h-4" />
                  <span>Personal</span>
                </TabsTrigger>
                <TabsTrigger
                  value="academic"
                  className="flex items-center space-x-2 transition-colors duration-300"
                  style={{ color: "var(--color-text)" }}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Academic</span>
                </TabsTrigger>
                <TabsTrigger
                  value="preferences"
                  className="flex items-center space-x-2 transition-colors duration-300"
                  style={{ color: "var(--color-text)" }}
                >
                  <Settings className="w-4 h-4" />
                  <span>Preferences</span>
                </TabsTrigger>
              </TabsList>

              {/* Personal Tab */}
              <TabsContent value="personal" className="space-y-6">
                <Card
                  className="border shadow-lg backdrop-blur-sm transition-colors duration-300"
                  style={{
                    backgroundColor: "var(--color-background)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                      <span style={{ color: "var(--color-text)" }}>Personal Information</span>
                    </CardTitle>
                    <CardDescription style={{ color: "var(--color-text-light)" }}>
                      Update your personal details and contact information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="flex items-center space-x-2">
                          <User className="w-4 h-4" style={{ color: "var(--color-text-light)" }} />
                          <span style={{ color: "var(--color-text)" }}>First Name</span>
                        </Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={profile?.firstName || ""}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className="h-12 transition-colors duration-300"
                          style={{
                            backgroundColor: "var(--color-background)",
                            borderColor: "var(--color-border)",
                            color: "var(--color-text)",
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="flex items-center space-x-2">
                          <User className="w-4 h-4" style={{ color: "var(--color-text-light)" }} />
                          <span style={{ color: "var(--color-text)" }}>Last Name</span>
                        </Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={profile?.lastName || ""}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className="h-12 transition-colors duration-300"
                          style={{
                            backgroundColor: "var(--color-background)",
                            borderColor: "var(--color-border)",
                            color: "var(--color-text)",
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center space-x-2">
                        <Mail className="w-4 h-4" style={{ color: "var(--color-text-light)" }} />
                        <span style={{ color: "var(--color-text)" }}>Email</span>
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={profile?.email || ""}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="h-12 transition-colors duration-300"
                        style={{
                          backgroundColor: "var(--color-background)",
                          borderColor: "var(--color-border)",
                          color: "var(--color-text)",
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center space-x-2">
                        <Phone className="w-4 h-4" style={{ color: "var(--color-text-light)" }} />
                        <span style={{ color: "var(--color-text)" }}>Phone Number</span>
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={profile?.phone || ""}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="h-12 transition-colors duration-300"
                        style={{
                          backgroundColor: "var(--color-background)",
                          borderColor: "var(--color-border)",
                          color: "var(--color-text)",
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="country" className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4" style={{ color: "var(--color-text-light)" }} />
                          <span style={{ color: "var(--color-text)" }}>Home Country</span>
                        </Label>
                        <CountrySelect
                          id="country"
                          value={profile?.country || ""}
                          onChange={(v) => handleSelect("country", v)}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="destination" className="flex items-center space-x-2">
                          <Globe className="w-4 h-4" style={{ color: "var(--color-text-light)" }} />
                          <span style={{ color: "var(--color-text)" }}>Destination Country</span>
                        </Label>
                        <CountrySelect
                          id="destination"
                          value={profile?.destination || ""}
                          onChange={(v) => handleSelect("destination", v)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio" className="flex items-center space-x-2">
                        <MessageCircle className="w-4 h-4" style={{ color: "var(--color-text-light)" }} />
                        <span style={{ color: "var(--color-text)" }}>Bio</span>
                      </Label>
                      <Textarea
                        id="bio"
                        name="bio"
                        value={profile?.bio || ""}
                        onChange={handleChange}
                        disabled={!isEditing}
                        rows={4}
                        className="resize-none transition-colors duration-300"
                        style={{
                          backgroundColor: "var(--color-background)",
                          borderColor: "var(--color-border)",
                          color: "var(--color-text)",
                        }}
                      />
                    </div>
                    {/* Education Comparison CTA */}
                    <Card
                      className="border hover:shadow-md transition-all duration-300"
                      style={{
                        backgroundColor: "var(--color-background)",
                        borderColor: "var(--color-border)",
                      }}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-3">
                              <BarChart3 className="w-6 h-6" style={{ color: "var(--color-primary)" }} />
                              <h3 className="font-semibold text-lg" style={{ color: "var(--color-text)" }}>
                                Education System Comparison
                              </h3>
                            </div>
                            <p className="mb-4 leading-relaxed" style={{ color: "var(--color-text-light)" }}>
                              Get detailed insights comparing education systems between your home and destination
                              country. Understand requirements, equivalencies, and pathways.
                            </p>
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant="secondary"
                                className="transition-colors duration-300"
                                style={{
                                  backgroundColor: "var(--color-primary)20",
                                  color: "var(--color-primary)",
                                }}
                              >
                                Free Tool
                              </Badge>
                              <Badge
                                variant="secondary"
                                className="transition-colors duration-300"
                                style={{
                                  backgroundColor: "#10b98120",
                                  color: "#10b981",
                                }}
                              >
                                Instant Results
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Button
                            className="text-white transition-all duration-300"
                            style={{
                              background: `linear-gradient(to right, var(--color-primary), var(--color-accent))`,
                              border: "none",
                            }}
                            onClick={() => router.push("/Compare-education")}
                            disabled={isEditing}
                          >
                            <span>Compare Now</span>
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Academic Tab */}
              <TabsContent value="academic" className="space-y-6">
                <Card
                  className="border shadow-lg backdrop-blur-sm transition-colors duration-300"
                  style={{
                    backgroundColor: "var(--color-background)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <GraduationCap className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                      <span style={{ color: "var(--color-text)" }}>Academic Information</span>
                    </CardTitle>
                    <CardDescription style={{ color: "var(--color-text-light)" }}>
                      Manage your educational details and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="educationalLevel" className="flex items-center space-x-2">
                        <GraduationCap className="w-4 h-4" style={{ color: "var(--color-text-light)" }} />
                        <span style={{ color: "var(--color-text)" }}>Educational Level</span>
                      </Label>
                      <Select
                        disabled={!isEditing}
                        value={profile?.educationalLevel}
                        onValueChange={(v) => handleSelect("educationalLevel", v)}
                      >
                        <SelectTrigger
                          id="educationalLevel"
                          className="h-12 transition-colors duration-300"
                          style={{
                            backgroundColor: "var(--color-background)",
                            borderColor: "var(--color-border)",
                            color: "var(--color-text)",
                          }}
                        >
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-auto">
                          {levelOptions.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fieldOfStudy" className="flex items-center space-x-2">
                        <BookOpen className="w-4 h-4" style={{ color: "var(--color-text-light)" }} />
                        <span style={{ color: "var(--color-text)" }}>Field of Study</span>
                      </Label>
                      <Select
                        disabled={!isEditing}
                        value={profile?.fieldOfStudy}
                        onValueChange={(v) => handleSelect("fieldOfStudy", v)}
                      >
                        <SelectTrigger
                          id="fieldOfStudy"
                          className="h-12 transition-colors duration-300"
                          style={{
                            backgroundColor: "var(--color-background)",
                            borderColor: "var(--color-border)",
                            color: "var(--color-text)",
                          }}
                        >
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-auto">
                          {fieldOptions.map((field) => (
                            <SelectItem key={field} value={field}>
                              {field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Preferences Tab */}
              <TabsContent value="preferences" className="space-y-6">
                <Card
                  className="border shadow-lg backdrop-blur-sm transition-colors duration-300"
                  style={{
                    backgroundColor: "var(--color-background)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Settings className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                      <span style={{ color: "var(--color-text)" }}>Preferences</span>
                    </CardTitle>
                    <CardDescription style={{ color: "var(--color-text-light)" }}>
                      Manage your notification and content preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-6">
                      <div
                        className="flex items-center justify-between p-4 rounded-lg"
                        style={{ backgroundColor: "var(--color-primary)10" }}
                      >
                        <div className="flex items-center space-x-3">
                          <Bell className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                          <div>
                            <h4 className="font-medium" style={{ color: "var(--color-text)" }}>
                              Email Notifications
                            </h4>
                            <p className="text-sm" style={{ color: "var(--color-text-light)" }}>
                              Receive email updates and announcements
                            </p>
                          </div>
                        </div>
                        <Switch
                          disabled={!isEditing}
                          checked={profile?.preferences.emailNotifications}
                          onCheckedChange={() => handlePrefChange("emailNotifications")}
                        />
                      </div>
                      <div
                        className="flex items-center justify-between p-4 rounded-lg"
                        style={{ backgroundColor: "var(--color-accent)10" }}
                      >
                        <div className="flex items-center space-x-3">
                          <Bell className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                          <div>
                            <h4 className="font-medium" style={{ color: "var(--color-text)" }}>
                              App Notifications
                            </h4>
                            <p className="text-sm" style={{ color: "var(--color-text-light)" }}>
                              Receive in-app updates and alerts
                            </p>
                          </div>
                        </div>
                        <Switch
                          disabled={!isEditing}
                          checked={profile?.preferences.appNotifications}
                          onCheckedChange={() => handlePrefChange("appNotifications")}
                        />
                      </div>
                      <div
                        className="flex items-center justify-between p-4 rounded-lg"
                        style={{ backgroundColor: "#10b98110" }}
                      >
                        <div className="flex items-center space-x-3">
                          <Lightbulb className="w-5 h-5 text-green-600" />
                          <div>
                            <h4 className="font-medium" style={{ color: "var(--color-text)" }}>
                              Resource Recommendations
                            </h4>
                            <p className="text-sm" style={{ color: "var(--color-text-light)" }}>
                              Get personalized educational resources
                            </p>
                          </div>
                        </div>
                        <Switch
                          disabled={!isEditing}
                          checked={profile?.preferences.resourceRecommendations}
                          onCheckedChange={() => handlePrefChange("resourceRecommendations")}
                        />
                      </div>
                      <div
                        className="flex items-center justify-between p-4 rounded-lg"
                        style={{ backgroundColor: "#f9731610" }}
                      >
                        <div className="flex items-center space-x-3">
                          <Users className="w-5 h-5 text-orange-600" />
                          <div>
                            <h4 className="font-medium" style={{ color: "var(--color-text)" }}>
                              Peer Connections
                            </h4>
                            <p className="text-sm" style={{ color: "var(--color-text-light)" }}>
                              Allow connections with other students
                            </p>
                          </div>
                        </div>
                        <Switch
                          disabled={!isEditing}
                          checked={profile?.preferences.peerConnections}
                          onCheckedChange={() => handlePrefChange("peerConnections")}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Save/Cancel Footer */}
              {isEditing && (
                <Card
                  className="border shadow-lg backdrop-blur-sm transition-colors duration-300"
                  style={{
                    backgroundColor: "var(--color-background)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <CardFooter className="flex justify-end gap-4 p-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      disabled={saving}
                      className="px-6 transition-colors duration-300"
                      style={{
                        borderColor: "var(--color-border)",
                        color: "var(--color-text)",
                        backgroundColor: "transparent",
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      className="px-6 text-white transition-all duration-300"
                      style={{
                        background: `linear-gradient(to right, var(--color-primary), var(--color-accent))`,
                        border: "none",
                      }}
                      onClick={saveProfile}
                      disabled={saving}
                    >
                      {saving ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
}
