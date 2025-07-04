"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../app/components/ui/card"
import { Progress } from "../app/components/ui/progress"
import Navbar from "../app/components/Navbar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../app/components/ui/tabs"
import { Button } from "../app/components/ui/button"
import { Badge } from "../app/components/ui/badge"
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Users,
  TrendingUp,
  Calendar,
  Star,
  Activity,
  Target,
  Award,
  MessageSquare,
  MapPin,
  Globe,
  GraduationCap,
  Bookmark,
  User,
  Mail,
  Phone,
  Circle,
  Trophy,
  ArrowRight,
} from "lucide-react"
import { useRouter } from "next/navigation"

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

type JourneyStep = {
  id: number
  title: string
  description: string
  tasks: { id: number; title: string; completed: boolean }[]
  resources: {
    id: number
    title: string
    type: "Article" | "Video" | "Checklist" | "Guide"
    href?: string
  }[]
  completed: boolean
}

interface Post {
  id: string
  author: { name: string; avatar?: string; initials: string }
  content: string
  likes: number
  comments: any[]
  shares: number
  createdAt: string
}

interface DashboardStats {
  totalTasks: number
  completedTasks: number
  savedResources: number
  communityPosts: number
  profileCompletion: number
  journeyProgress: number
  currentJourneyStep: string
  nextJourneyTask: string
  recentActivity: Array<{
    type: "profile" | "community" | "resource" | "comparison" | "journey"
    title: string
    description: string
    timestamp: string
    icon: any
  }>
  upcomingTasks: Array<{
    title: string
    description: string
    dueDate: string
    priority: "high" | "medium" | "low"
    category: string
    source?: "journey" | "profile" | "general"
  }>
  recommendations: Array<{
    title: string
    description: string
    type: string
    action: string
    href?: string
  }>
}

const Dashboard = () => {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    savedResources: 0,
    communityPosts: 0,
    profileCompletion: 0,
    journeyProgress: 0,
    currentJourneyStep: "",
    nextJourneyTask: "",
    recentActivity: [],
    upcomingTasks: [],
    recommendations: [],
  })
  const [loading, setLoading] = useState(true)
  const [journeySteps, setJourneySteps] = useState<JourneyStep[]>([])

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Check if user is logged in
        const storedUser = localStorage.getItem("user")
        const sessionFlag = sessionStorage.getItem("isLoggedIn")

        if (storedUser && sessionFlag === "true") {
          const userData = JSON.parse(storedUser)
          setUser(userData)
          setIsLoggedIn(true)

          // Fetch additional user data from API
          await fetchUserProfile()
          await fetchUserPosts()
          await generateDashboardStats(userData)
        } else {
          setIsLoggedIn(false)
          // Generate guest stats
          generateGuestStats()
        }
      } catch (error) {
        console.error("Dashboard initialization error:", error)
        generateGuestStats()
      } finally {
        setLoading(false)
      }
    }

    initializeDashboard()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        // Update localStorage with fresh data
        localStorage.setItem("user", JSON.stringify(data.user))
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
    }
  }

  const fetchUserPosts = async () => {
    try {
      const response = await fetch("/api/posts")
      if (response.ok) {
        const data = await response.json()
        const allPosts = data.map((p: any) => ({
          id: p._id,
          author: p.author,
          content: p.content,
          likes: p.likes,
          comments: p.comments || [],
          shares: p.shares,
          createdAt: p.createdAt,
        }))
        setPosts(allPosts)
      }
    } catch (error) {
      console.error("Error fetching posts:", error)
    }
  }

  const generateDashboardStats = async (userData: UserProfile) => {
    try {
      // Load journey data
      const storedJourney = localStorage.getItem("journeySteps")
      let journeyData: JourneyStep[] = []
      if (storedJourney) {
        journeyData = JSON.parse(storedJourney)
        setJourneySteps(journeyData)
      }

      // Calculate journey progress
      const totalJourneyTasks = journeyData.reduce((acc, step) => acc + step.tasks.length, 0)
      const completedJourneyTasks = journeyData.reduce(
        (acc, step) => acc + step.tasks.filter((t) => t.completed).length,
        0,
      )
      const journeyProgress = totalJourneyTasks > 0 ? Math.round((completedJourneyTasks / totalJourneyTasks) * 100) : 0

      // Find current journey step and next task
      const currentStep = journeyData.find((step) => !step.completed && step.tasks.some((task) => !task.completed))
      const currentJourneyStep = currentStep ? currentStep.title : "Journey Complete!"
      const nextTask = currentStep?.tasks.find((task) => !task.completed)
      const nextJourneyTask = nextTask ? nextTask.title : "All tasks completed!"

      // Calculate profile completion
      const profileFields = [
        userData.firstName,
        userData.lastName,
        userData.email,
        userData.country,
        userData.destination,
        userData.educationalLevel,
        userData.fieldOfStudy,
        userData.phone,
        userData.bio,
      ]
      const completedFields = profileFields.filter((field) => field && field.trim() !== "").length
      const profileCompletion = Math.round((completedFields / profileFields.length) * 100)

      // Get saved resources from localStorage with error handling
      let savedResources = []
      try {
        const storedResources = localStorage.getItem("savedResources")
        if (storedResources) {
          const parsed = JSON.parse(storedResources)
          savedResources = Array.isArray(parsed) ? parsed : []
        }
      } catch (error) {
        console.error("Error parsing saved resources:", error)
        savedResources = []
      }

      // Get user's posts
      const userPosts = posts.filter((post) => post.author.name === `${userData.firstName} ${userData.lastName}`)

      // Generate recent activity based on real data
      const recentActivity = []

      // Add journey activity
      if (completedJourneyTasks > 0) {
        const lastCompletedStep = journeyData.find((step) => step.completed)
        if (lastCompletedStep) {
          recentActivity.push({
            type: "journey" as const,
            title: "Journey Step Completed",
            description: `Completed "${lastCompletedStep.title}" with all tasks`,
            timestamp: new Date().toISOString(),
            icon: Trophy,
          })
        }
      }

      // Add profile completion activity
      if (profileCompletion > 50) {
        recentActivity.push({
          type: "profile" as const,
          title: "Profile Updated",
          description: `Profile is ${profileCompletion}% complete`,
          timestamp: new Date().toISOString(),
          icon: User,
        })
      }

      // Add community activity
      if (userPosts.length > 0) {
        const latestPost = userPosts[0]
        recentActivity.push({
          type: "community" as const,
          title: "Posted in Community",
          description: latestPost.content.substring(0, 50) + "...",
          timestamp: latestPost.createdAt,
          icon: MessageSquare,
        })
      }

      // Add resource activity with more detail
      if (savedResources.length > 0) {
        const latestResource = savedResources[savedResources.length - 1]
        recentActivity.push({
          type: "resource" as const,
          title: "Resource Saved",
          description: `Saved "${latestResource.title || "resource"}" - Total: ${savedResources.length} resources`,
          timestamp: new Date().toISOString(),
          icon: Bookmark,
        })
      }

      // Generate upcoming tasks based on profile data and journey
      const upcomingTasks = []

      // Add journey tasks
      if (currentStep) {
        const incompleteTasks = currentStep.tasks.filter((task) => !task.completed)
        incompleteTasks.slice(0, 3).forEach((task, index) => {
          upcomingTasks.push({
            title: task.title,
            description: `Complete this task in "${currentStep.title}" journey step`,
            dueDate: new Date(Date.now() + (index + 1) * 3 * 24 * 60 * 60 * 1000).toISOString(),
            priority: index === 0 ? ("high" as const) : ("medium" as const),
            category: currentStep.title,
            source: "journey" as const,
          })
        })
      }

      // Add profile-based tasks
      if (!userData.destination) {
        upcomingTasks.push({
          title: "Choose Destination Country",
          description: "Select your study destination to get personalized recommendations",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          priority: "high" as const,
          category: "Profile Setup",
          source: "profile" as const,
        })
      }

      if (!userData.fieldOfStudy) {
        upcomingTasks.push({
          title: "Add Field of Study",
          description: "Specify your academic field for better resource matching",
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          priority: "medium" as const,
          category: "Academic Planning",
          source: "profile" as const,
        })
      }

      if (profileCompletion < 80) {
        upcomingTasks.push({
          title: "Complete Your Profile",
          description: "Add missing information to unlock all features",
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          priority: "medium" as const,
          category: "Profile Setup",
          source: "profile" as const,
        })
      }

      // Generate recommendations based on user data
      const recommendations = []

      if (journeyProgress < 100) {
        recommendations.push({
          title: "Continue Your Journey",
          description: `You're ${journeyProgress}% through your academic journey. Keep going!`,
          type: "Journey",
          action: "View Journey",
          href: "/Journey",
        })
      }

      if (userData.country && userData.destination) {
        recommendations.push({
          title: "Education System Comparison",
          description: `Get detailed insights comparing ${userData.country} and ${userData.destination} education systems`,
          type: "Tool",
          action: "Compare Now",
          href: "/Compare-education",
        })
      }

      if (userPosts.length === 0) {
        recommendations.push({
          title: "Join the Community",
          description: "Share your experience and connect with fellow international students",
          type: "Community",
          action: "Create Post",
          href: "/Community",
        })
      }

      if (savedResources.length < 3) {
        recommendations.push({
          title: "Explore Resources",
          description: "Discover guides and tools to help with your academic transition",
          type: "Resources",
          action: "Browse Resources",
          href: "/Resources",
        })
      }

      // Calculate total task completion (including journey tasks)
      const totalTasks =
        upcomingTasks.length + completedJourneyTasks + (profileCompletion >= 100 ? 1 : 0) + userPosts.length
      const completedTasks = completedJourneyTasks + (profileCompletion >= 100 ? 1 : 0) + userPosts.length

      setDashboardStats({
        totalTasks,
        completedTasks,
        savedResources: savedResources.length,
        communityPosts: userPosts.length,
        profileCompletion,
        journeyProgress,
        currentJourneyStep,
        nextJourneyTask,
        recentActivity: recentActivity.slice(0, 5),
        upcomingTasks: upcomingTasks.slice(0, 5),
        recommendations: recommendations.slice(0, 3),
      })
    } catch (error) {
      console.error("Error generating dashboard stats:", error)
      generateGuestStats()
    }
  }

  const generateGuestStats = () => {
    setDashboardStats({
      totalTasks: 5,
      completedTasks: 0,
      savedResources: 0,
      communityPosts: 0,
      profileCompletion: 0,
      journeyProgress: 0,
      currentJourneyStep: "Get Started",
      nextJourneyTask: "Create your account to begin",
      recentActivity: [
        {
          type: "profile",
          title: "Welcome!",
          description: "Sign in to track your academic journey",
          timestamp: new Date().toISOString(),
          icon: User,
        },
      ],
      upcomingTasks: [
        {
          title: "Create Your Account",
          description: "Sign up to access personalized features and track your progress",
          dueDate: new Date().toISOString(),
          priority: "high",
          category: "Getting Started",
        },
        {
          title: "Complete Your Profile",
          description: "Add your academic background and destination preferences",
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          priority: "high",
          category: "Profile Setup",
        },
      ],
      recommendations: [
        {
          title: "Get Started",
          description: "Create an account to unlock personalized recommendations",
          type: "Account",
          action: "Sign Up",
          href: "/SignUp",
        },
      ],
    })
  }

  const getProgressText = (value: number) => {
    if (value >= 75) return "Excellent progress!"
    if (value >= 50) return "Good momentum!"
    if (value >= 25) return "Keep going!"
    return "Just getting started"
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "#ef4444"
      case "medium":
        return "#eab308"
      case "low":
        return "#22c55e"
      default:
        return "#6b7280"
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return "High Priority"
      case "medium":
        return "Medium Priority"
      case "low":
        return "Low Priority"
      default:
        return "Normal"
    }
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center transition-colors duration-300"
        style={{ backgroundColor: "var(--color-background)" }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 border-4 rounded-full animate-spin mb-4"
            style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-primary)" }}
          ></div>
          <p className="text-lg" style={{ color: "var(--color-text)" }}>
            Loading your dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: "var(--color-background)" }}>
      <Navbar />

      <main className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] bg-clip-text text-transparent">
                {isLoggedIn && user ? `Welcome back, ${user.firstName}!` : "Welcome!"}
              </h1>
              <p className="text-lg max-w-2xl" style={{ color: "var(--color-text-light)" }}>
                {isLoggedIn
                  ? "Track your academic transition journey and access personalized resources to succeed in your studies abroad."
                  : "Sign in to track your academic journey and get personalized recommendations for studying abroad."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="border transition-colors duration-300"
                style={{
                  backgroundColor: isLoggedIn ? "var(--color-primary)" : "#6b7280",
                  color: "white",
                  borderColor: isLoggedIn ? "var(--color-primary)" : "#6b7280",
                }}
              >
                <Activity className="w-3 h-3 mr-1" />
                {isLoggedIn ? "Active" : "Guest"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card
            className="relative overflow-hidden border shadow-lg transition-all duration-300 hover:shadow-xl"
            style={{
              backgroundColor: "var(--color-gray-400)",
              borderColor: "var(--color-border)",
              color: "white",
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-white/90">Journey Progress</CardTitle>
                <Target className="w-4 h-4 text-white/80" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{dashboardStats.journeyProgress}%</div>
              <Progress value={dashboardStats.journeyProgress} className="mb-2 bg-purple-600" />
              <p className="text-xs text-white/80">{getProgressText(dashboardStats.journeyProgress)}</p>
            </CardContent>
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
          </Card>

          <Card
            className="relative overflow-hidden border shadow-lg transition-all duration-300 hover:shadow-xl"
            style={{
              backgroundColor: "#10b981",
              borderColor: "var(--color-border)",
              color: "white",
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-white/90">Tasks Completed</CardTitle>
                <CheckCircle2 className="w-4 h-4 text-white/80" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">
                {dashboardStats.completedTasks}/{dashboardStats.totalTasks}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {dashboardStats.upcomingTasks.length} pending
                </Badge>
              </div>
              <p className="text-xs text-white/80">
                {dashboardStats.totalTasks > 0
                  ? Math.round((dashboardStats.completedTasks / dashboardStats.totalTasks) * 100)
                  : 0}
                % completion rate
              </p>
            </CardContent>
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
          </Card>

          <Card
            className="relative overflow-hidden border shadow-lg transition-all duration-300 hover:shadow-xl"
            style={{
              backgroundColor: "var(--color-accent)",
              borderColor: "var(--color-border)",
              color: "white",
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-white/90">Resources Saved</CardTitle>
                <BookOpen className="w-4 h-4 text-white/80" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{dashboardStats.savedResources}</div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  Curated
                </Badge>
              </div>
              <p className="text-xs text-white/80">
                {dashboardStats.savedResources > 0 ? "Ready for your journey" : "Start saving resources"}
              </p>
            </CardContent>
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
          </Card>

          <Card
            className="relative overflow-hidden border shadow-lg transition-all duration-300 hover:shadow-xl"
            style={{
              backgroundColor: "#f97316",
              borderColor: "var(--color-border)",
              color: "white",
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-white/90">Community Posts</CardTitle>
                <Users className="w-4 h-4 text-white/80" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{dashboardStats.communityPosts}</div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>
              <p className="text-xs text-white/80">
                {dashboardStats.communityPosts > 0 ? "Community contributor" : "Join the conversation"}
              </p>
            </CardContent>
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
          </Card>
        </div>

        {/* User Profile Summary (for logged in users) */}
        {isLoggedIn && user && (
          <Card
            className="mb-8 shadow-lg border transition-all duration-300"
            style={{
              backgroundColor: "var(--color-background)",
              borderColor: "var(--color-border)",
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3" style={{ color: "var(--color-text)" }}>
                <User className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                Your Profile Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" style={{ color: "var(--color-text-light)" }} />
                    <span className="text-sm" style={{ color: "var(--color-text-light)" }}>
                      Email:
                    </span>
                    <span className="font-medium" style={{ color: "var(--color-text)" }}>
                      {user.email}
                    </span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" style={{ color: "var(--color-text-light)" }} />
                      <span className="text-sm" style={{ color: "var(--color-text-light)" }}>
                        Phone:
                      </span>
                      <span className="font-medium" style={{ color: "var(--color-text)" }}>
                        {user.phone}
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" style={{ color: "var(--color-text-light)" }} />
                    <span className="text-sm" style={{ color: "var(--color-text-light)" }}>
                      From:
                    </span>
                    <span className="font-medium" style={{ color: "var(--color-text)" }}>
                      {user.country}
                    </span>
                  </div>
                  {user.destination && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" style={{ color: "var(--color-text-light)" }} />
                      <span className="text-sm" style={{ color: "var(--color-text-light)" }}>
                        To:
                      </span>
                      <span className="font-medium" style={{ color: "var(--color-text)" }}>
                        {user.destination}
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" style={{ color: "var(--color-text-light)" }} />
                    <span className="text-sm" style={{ color: "var(--color-text-light)" }}>
                      Level:
                    </span>
                    <span className="font-medium" style={{ color: "var(--color-text)" }}>
                      {user.educationalLevel}
                    </span>
                  </div>
                  {user.fieldOfStudy && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" style={{ color: "var(--color-text-light)" }} />
                      <span className="text-sm" style={{ color: "var(--color-text-light)" }}>
                        Field:
                      </span>
                      <span className="font-medium" style={{ color: "var(--color-text)" }}>
                        {user.fieldOfStudy}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Journey Status Card (for logged in users) */}
        {isLoggedIn && user && (
          <Card
            className="mb-8 shadow-lg border transition-all duration-300"
            style={{
              backgroundColor: "var(--color-background)",
              borderColor: "var(--color-border)",
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-3" style={{ color: "var(--color-text)" }}>
                <Trophy className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                Your Academic Journey Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                        Overall Progress
                      </span>
                      <span className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>
                        {dashboardStats.journeyProgress}%
                      </span>
                    </div>
                    <Progress value={dashboardStats.journeyProgress} className="h-2" />
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--color-primary)10" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Circle className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
                      <span className="font-medium text-sm" style={{ color: "var(--color-text)" }}>
                        Current Step
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "var(--color-text-light)" }}>
                      {dashboardStats.currentJourneyStep}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--color-accent)10" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4" style={{ color: "var(--color-accent)" }} />
                      <span className="font-medium text-sm" style={{ color: "var(--color-text)" }}>
                        Next Task
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "var(--color-text-light)" }}>
                      {dashboardStats.nextJourneyTask}
                    </p>
                  </div>
                  <Button
                    className="w-full text-white transition-all duration-300"
                    style={{
                      background: `linear-gradient(to right, var(--color-primary), var(--color-accent))`,
                      border: "none",
                    }}
                    onClick={() => router.push("/Journey")}
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Continue Journey
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Card
          className="shadow-lg border transition-all duration-300"
          style={{
            backgroundColor: "var(--color-background)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="p-6">
            <Tabs defaultValue="upcoming" className="w-full">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <TabsList
                  className="grid w-full sm:w-auto grid-cols-3 p-1 rounded-lg transition-colors duration-300"
                  style={{ backgroundColor: "var(--color-border)" }}
                >
                  <TabsTrigger
                    value="upcoming"
                    className="data-[state=active]:shadow-sm font-medium transition-all duration-300"
                    style={{
                      color: "var(--color-text)",
                      backgroundColor: "transparent",
                    }}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Upcoming Tasks
                  </TabsTrigger>
                  <TabsTrigger
                    value="recommended"
                    className="data-[state=active]:shadow-sm font-medium transition-all duration-300"
                    style={{
                      color: "var(--color-text)",
                      backgroundColor: "transparent",
                    }}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Recommended
                  </TabsTrigger>
                  <TabsTrigger
                    value="recent"
                    className="data-[state=active]:shadow-sm font-medium transition-all duration-300"
                    style={{
                      color: "var(--color-text)",
                      backgroundColor: "transparent",
                    }}
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    Recent Activity
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="upcoming" className="space-y-4 mt-6">
                {dashboardStats.upcomingTasks.length > 0 ? (
                  dashboardStats.upcomingTasks.map((task, index) => (
                    <Card
                      key={index}
                      className="border-l-4 shadow-md hover:shadow-lg transition-all duration-300"
                      style={{
                        borderLeftColor: getPriorityColor(task.priority),
                        backgroundColor: "var(--color-background)",
                        borderColor: "var(--color-border)",
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
                              {task.title}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Calendar className="w-4 h-4" style={{ color: getPriorityColor(task.priority) }} />
                              <span className="font-medium" style={{ color: getPriorityColor(task.priority) }}>
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            </CardDescription>
                          </div>
                          <Badge
                            variant="secondary"
                            style={{
                              backgroundColor: `${getPriorityColor(task.priority)}20`,
                              color: getPriorityColor(task.priority),
                              borderColor: `${getPriorityColor(task.priority)}40`,
                            }}
                          >
                            {getPriorityBadge(task.priority)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="mb-4" style={{ color: "var(--color-text-light)" }}>
                          {task.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            style={{
                              backgroundColor: "transparent",
                              color: "var(--color-text)",
                              borderColor: "var(--color-border)",
                            }}
                          >
                            {task.category}
                          </Badge>
                          <Button
                            className="ml-auto shadow-md transition-all duration-300 hover:opacity-90"
                            style={{
                              backgroundColor: "var(--color-primary)",
                              color: "white",
                              border: "none",
                            }}
                            onClick={() => {
                              if (task.source === "journey") {
                                router.push("/Journey")
                              } else if (task.title.includes("Profile")) {
                                router.push("/Profile")
                              } else if (task.title.includes("Compare")) {
                                router.push("/Compare-education")
                              } else if (task.title.includes("Destination")) {
                                router.push("/Profile")
                              }
                            }}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {task.source === "journey" ? "View Journey" : "Take Action"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card
                    className="shadow-md transition-all duration-300"
                    style={{
                      backgroundColor: "var(--color-background)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <CardContent className="text-center py-16">
                      <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
                      <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--color-text)" }}>
                        All caught up!
                      </h3>
                      <p style={{ color: "var(--color-text-light)" }}>You have no pending tasks. Great job!</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="recommended" className="space-y-4 mt-6">
                {dashboardStats.recommendations.map((rec, index) => (
                  <Card
                    key={index}
                    className="shadow-md hover:shadow-lg transition-all duration-300 border-0"
                    style={{
                      background: `linear-gradient(135deg, var(--color-primary)10, var(--color-accent)10)`,
                      backgroundColor: "var(--color-background)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
                            {rec.title}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Star className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
                            <span className="font-medium" style={{ color: "var(--color-primary)" }}>
                              Recommended for You
                            </span>
                          </CardDescription>
                        </div>
                        <Badge
                          className="border"
                          style={{
                            backgroundColor: "var(--color-accent)",
                            color: "white",
                            borderColor: "var(--color-accent)",
                          }}
                        >
                          <Award className="w-3 h-3 mr-1" />
                          {rec.type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4" style={{ color: "var(--color-text-light)" }}>
                        {rec.description}
                      </p>
                      <Button
                        className="transition-all duration-300 hover:opacity-90"
                        style={{
                          backgroundColor: "var(--color-primary)",
                          color: "white",
                          border: "none",
                        }}
                        onClick={() => rec.href && router.push(rec.href)}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        {rec.action}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="recent" className="space-y-4 mt-6">
                {dashboardStats.recentActivity.length > 0 ? (
                  dashboardStats.recentActivity.map((activity, index) => {
                    const IconComponent = activity.icon
                    return (
                      <Card
                        key={index}
                        className="shadow-md border-l-4 transition-all duration-300"
                        style={{
                          borderLeftColor: "var(--color-primary)",
                          backgroundColor: "var(--color-background)",
                          borderColor: "var(--color-border)",
                        }}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle
                                className="text-lg font-semibold flex items-center gap-2"
                                style={{ color: "var(--color-text)" }}
                              >
                                <IconComponent className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                                {activity.title}
                              </CardTitle>
                              <CardDescription className="ml-7" style={{ color: "var(--color-text-light)" }}>
                                {new Date(activity.timestamp).toLocaleDateString()}
                              </CardDescription>
                            </div>
                            <Badge
                              className="border capitalize"
                              style={{
                                backgroundColor: "var(--color-primary)",
                                color: "white",
                                borderColor: "var(--color-primary)",
                              }}
                            >
                              {activity.type}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="ml-7" style={{ color: "var(--color-text-light)" }}>
                            {activity.description}
                          </p>
                        </CardContent>
                      </Card>
                    )
                  })
                ) : (
                  <Card
                    className="shadow-md transition-all duration-300"
                    style={{
                      backgroundColor: "var(--color-background)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <CardContent className="text-center py-16">
                      <Activity className="h-16 w-16 mx-auto mb-4" style={{ color: "var(--color-text-light)" }} />
                      <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--color-text)" }}>
                        No recent activity
                      </h3>
                      <p style={{ color: "var(--color-text-light)" }}>
                        Start using the platform to see your activity here.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      </main>
    </div>
  )
}

export default Dashboard
