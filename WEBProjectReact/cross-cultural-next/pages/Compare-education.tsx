"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Navbar from "../app/components/Navbar"
import { Button } from "../app/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../app/components/ui/card"
import { Badge } from "../app/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../app/components/ui/tabs"
import {
  ChevronDown,
  ChevronRight,
  BarChart3,
  BookOpen,
  Calendar,
  Users,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Globe,
  GraduationCap,
  ArrowRight,
  Lightbulb,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import CountrySelect from "../app/components/ui/CountrySelect"
import { useToast } from "../app/components/ui/use-toast"
import Link from "next/link"

// Define types for our data structure
type ComparisonSection = {
  title: string
  homeCountry: string[]
  destinationCountry: string[]
}

type ComparisonData = {
  academicLevels: ComparisonSection
  gradingSystems: ComparisonSection
  academicCalendar: ComparisonSection
  teachingStyle: ComparisonSection
  commonChallenges: ComparisonSection
  admissionRequirements: ComparisonSection
}

type ComparisonMetadata = {
  homeCountry: string
  destinationCountry: string
  generatedAt: string
  source: "ai-powered" | "fallback"
  error?: string
}

type ExpandedSections = {
  academicLevels: boolean
  gradingSystems: boolean
  academicCalendar: boolean
  teachingStyle: boolean
  commonChallenges: boolean
  admissionRequirements: boolean
}

type SectionKey = keyof ExpandedSections

const CompareEducation = () => {
  const router = useRouter()
  const { toast } = useToast()

  // Ref for abort controller to cleanup requests
  const abortControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  // State for selected countries
  const [homeCountry, setHomeCountry] = useState<string>("")
  const [destinationCountry, setDestinationCountry] = useState<string>("")

  // State for comparison data
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null)
  const [metadata, setMetadata] = useState<ComparisonMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasCompared, setHasCompared] = useState(false)

  // State for expanded sections
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    academicLevels: true,
    gradingSystems: false,
    academicCalendar: false,
    teachingStyle: false,
    commonChallenges: false,
    admissionRequirements: false,
  })

  // Cleanup function for component unmount
  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Load user data from localStorage (client-side only)
  useEffect(() => {
    // Check if we're on the client side
    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem("user")
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          if (mountedRef.current) {
            setHomeCountry(userData.country || "")
            setDestinationCountry(userData.destination || "")
          }
        }
      } catch (error) {
        console.error("Error loading user data from localStorage:", error)
      }
    }
  }, [])

  // Toggle section expansion
  const toggleSection = useCallback((section: SectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }, [])

  // Fetch comparison data using the new API with proper cleanup
  const fetchComparisonData = useCallback(async () => {
    if (!homeCountry || !destinationCountry) {
      toast({
        title: "Please select both countries",
        description: "Choose your home country and destination country to compare.",
        variant: "destructive",
      })
      return
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    if (!mountedRef.current) return
    setIsLoading(true)

    try {
      const response = await fetch("/api/compare-education", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          homeCountry,
          destinationCountry,
        }),
        signal: abortControllerRef.current.signal,
      })

      // Check if component is still mounted
      if (!mountedRef.current) return

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`)
      }

      const result = await response.json()

      // Check again if component is still mounted before updating state
      if (mountedRef.current) {
        setComparisonData(result.data)
        setMetadata(result.metadata)
        setHasCompared(true)

        if (result.success) {
          toast({
            title: "Comparison Complete!",
            description: "Education systems have been compared successfully.",
          })
        } else {
          toast({
            title: "Using Fallback Data",
            description: result.metadata.error || "AI service unavailable, showing general comparison.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      // Only handle error if component is still mounted and it's not an abort error
      if (mountedRef.current && error instanceof Error && error.name !== "AbortError") {
        console.error("Error fetching comparison:", error)
        toast({
          title: "Error",
          description: "Failed to fetch comparison data. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
      abortControllerRef.current = null
    }
  }, [homeCountry, destinationCountry, toast])

  // Render comparison section
  const renderComparisonSection = useCallback(
    (sectionKey: SectionKey) => {
      if (!comparisonData) return null

      const section = comparisonData[sectionKey]

      const getSectionIcon = (key: SectionKey) => {
        switch (key) {
          case "academicLevels":
            return GraduationCap
          case "gradingSystems":
            return BarChart3
          case "academicCalendar":
            return Calendar
          case "teachingStyle":
            return Users
          case "commonChallenges":
            return AlertTriangle
          case "admissionRequirements":
            return BookOpen
          default:
            return BookOpen
        }
      }

      const getSectionColor = (key: SectionKey) => {
        switch (key) {
          case "academicLevels":
            return "from-blue-500 to-blue-600"
          case "gradingSystems":
            return "from-green-500 to-green-600"
          case "academicCalendar":
            return "from-purple-500 to-purple-600"
          case "teachingStyle":
            return "from-orange-500 to-orange-600"
          case "commonChallenges":
            return "from-red-500 to-red-600"
          case "admissionRequirements":
            return "from-indigo-500 to-indigo-600"
          default:
            return "from-gray-500 to-gray-600"
        }
      }

      const Icon = getSectionIcon(sectionKey)

      return (
        <Card
          key={sectionKey}
          className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm"
        >
          <CardHeader
            className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
            onClick={() => toggleSection(sectionKey)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 bg-gradient-to-r ${getSectionColor(sectionKey)} rounded-xl flex items-center justify-center`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <CardTitle className="text-xl">{section.title}</CardTitle>
              </div>
              {expandedSections[sectionKey] ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )}
            </div>
          </CardHeader>
          {expandedSections[sectionKey] && (
            <CardContent className="pt-0">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Home Country */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <Globe className="w-3 h-3 text-blue-600" />
                    </div>
                    <h4 className="font-semibold text-blue-900">{metadata?.homeCountry}</h4>
                  </div>
                  <div className="space-y-3">
                    {section.homeCountry.map((item, index) => (
                      <div key={index} className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                        <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Destination Country */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                      <Globe className="w-3 h-3 text-purple-600" />
                    </div>
                    <h4 className="font-semibold text-purple-900">{metadata?.destinationCountry}</h4>
                  </div>
                  <div className="space-y-3">
                    {section.destinationCountry.map((item, index) => (
                      <div key={index} className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                        <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )
    },
    [comparisonData, expandedSections, metadata, toggleSection],
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />

      <main className="container py-8 px-4 md:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-12">
          <div className="text-center">
            <Badge variant="outline" className="mb-4 px-4 py-2 text-sm font-medium">
              <BarChart3 className="w-4 h-4 mr-2" />
              Education System Analysis
            </Badge>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Compare Education Systems
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Get AI-powered insights comparing education systems between your home country and study destination
            </p>
          </div>
        </div>

        {/* Country Selection */}
        <Card className="mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <span>Select Countries to Compare</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Your Home Country</label>
                <CountrySelect id="homeCountry" value={homeCountry} onChange={(value) => setHomeCountry(value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Your Destination Country</label>
                <CountrySelect
                  id="destinationCountry"
                  value={destinationCountry}
                  onChange={(value) => setDestinationCountry(value)}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <Button
                onClick={fetchComparisonData}
                disabled={isLoading || !homeCountry || !destinationCountry}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-3 text-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing Education Systems...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Compare Education Systems
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Comparison Results */}
        {hasCompared && metadata && (
          <>
            {/* Comparison Header */}
            <Card className="mb-8 border-0 shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">
                      {metadata.homeCountry} → {metadata.destinationCountry}
                    </h2>
                    <div className="flex items-center space-x-4">
                      <p className="text-blue-100">Comprehensive education system comparison</p>
                      <div className="flex items-center space-x-2">
                        {metadata.source === "ai-powered" ? (
                          <CheckCircle className="w-4 h-4 text-green-300" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-yellow-300" />
                        )}
                        <span className="text-xs text-blue-100">
                          {metadata.source === "ai-powered" ? "AI-Powered" : "Fallback Data"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={fetchComparisonData}
                    disabled={isLoading}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Comparison Sections */}
            {comparisonData && (
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="detailed">Detailed Comparison</TabsTrigger>
                  <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <div className="grid gap-6">
                    {(Object.keys(expandedSections) as SectionKey[]).map((sectionKey) =>
                      renderComparisonSection(sectionKey),
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="detailed" className="space-y-6">
                  <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-8 text-center">
                      <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Detailed Analysis</h3>
                      <p className="text-gray-600 mb-6">
                        Get in-depth analysis of specific aspects of both education systems
                      </p>
                      <Button className="bg-gradient-to-r from-blue-600 to-purple-600">Coming Soon</Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="recommendations" className="space-y-6">
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-blue-50">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Lightbulb className="w-5 h-5 text-orange-600" />
                        <span>Personalized Recommendations</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 bg-white rounded-lg border border-green-200">
                          <h4 className="font-semibold text-green-800 mb-2">Preparation Tips</h4>
                          <p className="text-sm text-gray-700">
                            Based on your comparison, focus on understanding the grading system and academic calendar
                            differences.
                          </p>
                        </div>
                        <div className="p-4 bg-white rounded-lg border border-blue-200">
                          <h4 className="font-semibold text-blue-800 mb-2">Resources to Explore</h4>
                          <p className="text-sm text-gray-700">
                            Check out our resource library for guides specific to your destination country.
                          </p>
                        </div>
                        <div className="p-4 bg-white rounded-lg border border-purple-200">
                          <h4 className="font-semibold text-purple-800 mb-2">Next Steps</h4>
                          <p className="text-sm text-gray-700">
                            Connect with mentors who have experience with both education systems.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </>
        )}

        {/* Help Section */}
        <Card className="mt-12 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Need More Help?</h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              This comparison provides a general overview. For personalized guidance specific to your academic
              transition, explore our additional resources.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/resources">
                <Button variant="outline" className="bg-white/80">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Explore Resources
                </Button>
              </Link>
              <Link href="/profile">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Back to Profile
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default CompareEducation
