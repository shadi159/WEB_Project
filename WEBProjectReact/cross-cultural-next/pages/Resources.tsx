"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../app/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../app/components/ui/tabs"
import { Button } from "../app/components/ui/button"
import { Input } from "../app/components/ui/input"
import { Badge } from "../app/components/ui/badge"
import {
  BookOpen,
  Search,
  ArrowRight,
  Filter,
  Star,
  Bookmark,
  BookmarkCheck,
  Play,
  FileText,
  CheckSquare,
  Settings,
  Users,
  Lightbulb,
  MessageCircle,
} from "lucide-react"
import Navbar from "../app/components/Navbar"
import Chatbot from "@/app/components/Chatbot"

type Resource = {
  id: number
  title: string
  description: string
  type: "Article" | "Video" | "Guide" | "Checklist" | "Tool"
  categories: string[]
  featured?: boolean
  href?: string
}

const resourcesData: Resource[] = [
  {
    id: 1,
    title: "Understanding Different Academic Systems",
    description: "Compare grading scales, teaching methods, and expectations across major educational systems.",
    type: "Guide",
    categories: ["Academic Systems", "Cultural Differences"],
    featured: true,
    href: "https://www.linkedin.com/pulse/understanding-different-educational-ry4jf/",
  },
  {
    id: 2,
    title: "Writing Academic Papers in Western Universities",
    description: "Learn about citation styles, plagiarism rules, and essay structure expectations.",
    type: "Article",
    categories: ["Academic Writing", "Study Skills"],
    href: "https://www.researchgate.net/publication/384722151_Academic_Writing_Challenges_and_Encouragements_Perspectives_of_University_Teachers_in_Far_Western_University",
  },
  {
    id: 3,
    title: "Managing Culture Shock in a New Academic Environment",
    description: "Practical tips for adjusting to new cultural norms in your educational setting.",
    type: "Video",
    categories: ["Cultural Adjustment", "Mental Health"],
    featured: true,
    href: "https://www.youtube.com/watch?v=omEcU1iTDYI",
  },
  {
    id: 4,
    title: "Financial Aid Options for International Students",
    description: "Overview of scholarships, grants, and work opportunities for students studying abroad.",
    type: "Guide",
    categories: ["Financial Planning", "Practical Resources"],
    href: "https://studentaid.gov/understand-aid/types/international",
  },
  {
    id: 5,
    title: "Student Visa Application Checklist",
    description: "Step-by-step guidance for preparing and submitting student visa applications.",
    type: "Checklist",
    categories: ["Visa & Immigration", "Practical Resources"],
    featured: true,
    href: "https://immi.homeaffairs.gov.au/visas/web-evidentiary-tool",
  },
  {
    id: 6,
    title: "Housing Options for International Students",
    description: "Compare on-campus housing, private rentals, and homestays in different countries.",
    type: "Guide",
    categories: ["Accommodation", "Practical Resources"],
    href: "https://goingto.university/getting-ready-university/international-student-accommodation/",
  },
  {
    id: 7,
    title: "Language Proficiency Test Preparation",
    description: "Strategies for improving your TOEFL, IELTS, or other language test scores.",
    type: "Video",
    categories: ["Language Skills", "Study Skills"],
    href: "https://www.youtube.com/watch?v=8nXX1WOuvrk",
  },
  {
    id: 8,
    title: "Building a Social Network in a New Country",
    description: "Tips for making friends and building connections in your new academic community.",
    type: "Article",
    categories: ["Social Integration", "Cultural Adjustment"],
    href: "https://www.nordicjobsworldwide.com/blog/2021/03/how-to-create-a-social-network-in-a-new-country",
  },
  {
    id: 9,
    title: "Understanding Healthcare Systems for International Students",
    description: "Navigate health insurance requirements and accessing medical care abroad.",
    type: "Guide",
    categories: ["Healthcare", "Practical Resources"],
    href: "https://www.april-international.com/en/international-student-insurance/guide/healthcare-guide-for-international-students",
  },
  {
    id: 10,
    title: "Academic Calendar Comparison Tool",
    description: "Interactive tool to compare academic year structures across different countries.",
    type: "Tool",
    categories: ["Academic Systems", "Planning"],
    href: "https://www.sqlbi.com/articles/comparing-different-school-terms-in-power-bi/",
  },
  {
    id: 11,
    title: "Working While Studying: Rules and Regulations",
    description: "Understanding work permits and employment restrictions for international students.",
    type: "Article",
    categories: ["Employment", "Legal Rights"],
    href: "https://www.cohortgo.com/en/blog/working-while-studying-rights-and-responsibilities",
  },
  {
    id: 12,
    title: "Preparing for Graduate Studies Abroad",
    description: "Special considerations for international students pursuing master's or doctoral degrees.",
    type: "Guide",
    categories: ["Graduate Education", "Academic Planning"],
    href: "https://www.educations.com/masters-abroad",
  },
]

const Resources = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [savedResources, setSavedResources] = useState<Resource[]>([])
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    // Load saved resources from localStorage on component mount
    const storedSavedResources = localStorage.getItem("savedResources")
    if (storedSavedResources) {
      try {
        const parsed = JSON.parse(storedSavedResources)
        setSavedResources(Array.isArray(parsed) ? parsed : [])
      } catch (error) {
        console.error("Error parsing saved resources:", error)
        setSavedResources([])
      }
    }
  }, [])

  // Add useEffect to save to localStorage whenever savedResources changes:
  useEffect(() => {
    localStorage.setItem("savedResources", JSON.stringify(savedResources))
  }, [savedResources])

  const toggleSaveResource = (resource: Resource) => {
    setSavedResources((prev) => {
      const isCurrentlySaved = prev.some((r) => r.id === resource.id)
      let newSavedResources

      if (isCurrentlySaved) {
        // Remove from saved resources
        newSavedResources = prev.filter((r) => r.id !== resource.id)
      } else {
        // Add to saved resources
        newSavedResources = [...prev, resource]
      }

      // Save to localStorage immediately
      localStorage.setItem("savedResources", JSON.stringify(newSavedResources))

      return newSavedResources
    })
  }

  const allCategories = Array.from(new Set(resourcesData.flatMap((resource) => resource.categories))).sort()

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  const filteredResources = resourcesData.filter((resource) => {
    const matchesSearch =
      searchQuery === "" ||
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategories =
      selectedCategories.length === 0 || selectedCategories.some((cat) => resource.categories.includes(cat))

    return matchesSearch && matchesCategories
  })

  const featuredResources = resourcesData.filter((r) => r.featured)

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Article":
        return FileText
      case "Video":
        return Play
      case "Guide":
        return BookOpen
      case "Checklist":
        return CheckSquare
      case "Tool":
        return Settings
      default:
        return BookOpen
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Article":
        return "from-blue-500 to-blue-600"
      case "Video":
        return "from-red-500 to-red-600"
      case "Guide":
        return "from-green-500 to-green-600"
      case "Checklist":
        return "from-purple-500 to-purple-600"
      case "Tool":
        return "from-orange-500 to-orange-600"
      default:
        return "from-gray-500 to-gray-600"
    }
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
                  backgroundColor: "var(--color-background)",
                  color: "var(--color-text)",
                  borderColor: "var(--color-border)",
                }}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Educational Resources
              </Badge>
              <h1
                className="text-4xl font-bold bg-gradient-to-r bg-clip-text text-transparent mb-2"
                style={{
                  backgroundImage: `linear-gradient(to right, var(--color-primary), var(--color-accent))`,
                }}
              >
                Resource Library
              </h1>
              <p className="text-xl mb-4" style={{ color: "var(--color-text-light)" }}>
                Explore guides, articles, and tools to help navigate your academic transition
              </p>
            </div>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <Card
              className="border shadow-sm backdrop-blur-sm transition-colors duration-300"
              style={{
                backgroundColor: "var(--color-background)",
                borderColor: "var(--color-border)",
              }}
            >
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>
                  {resourcesData.length}
                </div>
                <div className="text-sm" style={{ color: "var(--color-text-light)" }}>
                  Total Resources
                </div>
              </CardContent>
            </Card>
            <Card
              className="border shadow-sm backdrop-blur-sm transition-colors duration-300"
              style={{
                backgroundColor: "var(--color-background)",
                borderColor: "var(--color-border)",
              }}
            >
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold" style={{ color: "var(--color-accent)" }}>
                  {featuredResources.length}
                </div>
                <div className="text-sm" style={{ color: "var(--color-text-light)" }}>
                  Featured
                </div>
              </CardContent>
            </Card>
            <Card
              className="border shadow-sm backdrop-blur-sm transition-colors duration-300"
              style={{
                backgroundColor: "var(--color-background)",
                borderColor: "var(--color-border)",
              }}
            >
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{allCategories.length}</div>
                <div className="text-sm" style={{ color: "var(--color-text-light)" }}>
                  Categories
                </div>
              </CardContent>
            </Card>
            <Card
              className="border shadow-sm backdrop-blur-sm transition-colors duration-300"
              style={{
                backgroundColor: "var(--color-background)",
                borderColor: "var(--color-border)",
              }}
            >
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{savedResources.length}</div>
                <div className="text-sm" style={{ color: "var(--color-text-light)" }}>
                  Saved
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-4">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="all" className="space-y-6">
              <div className="flex flex-col lg:flex-row justify-between gap-4">
                <TabsList
                  className="backdrop-blur-sm border shadow-sm transition-colors duration-300"
                  style={{
                    backgroundColor: "var(--color-background)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <TabsTrigger
                    value="all"
                    className="flex items-center space-x-2 transition-colors duration-300"
                    style={{ color: "var(--color-text)" }}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>All Resources</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="featured"
                    className="flex items-center space-x-2 transition-colors duration-300"
                    style={{ color: "var(--color-text)" }}
                  >
                    <Star className="w-4 h-4" />
                    <span>Featured</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="saved"
                    className="flex items-center space-x-2 transition-colors duration-300"
                    style={{ color: "var(--color-text)" }}
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>Saved ({savedResources.length})</span>
                  </TabsTrigger>
                </TabsList>
                <div className="relative max-w-md">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
                    style={{ color: "var(--color-text-light)" }}
                  />
                  <Input
                    placeholder="Search resources..."
                    className="pl-10 h-12 backdrop-blur-sm transition-colors duration-300"
                    style={{
                      backgroundColor: "var(--color-background)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-text)",
                    }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <TabsContent value="all" className="space-y-6">
                {filteredResources.length > 0 ? (
                  <div className="grid gap-6">
                    {filteredResources.map((resource) => (
                      <ResourceCard
                        key={resource.id}
                        resource={resource}
                        isSaved={savedResources.some((r) => r.id === resource.id)}
                        onToggleSave={toggleSaveResource}
                        getTypeIcon={getTypeIcon}
                        getTypeColor={getTypeColor}
                      />
                    ))}
                  </div>
                ) : (
                  <Card
                    className="border shadow-lg backdrop-blur-sm transition-colors duration-300"
                    style={{
                      backgroundColor: "var(--color-background)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <CardContent className="text-center py-16">
                      <BookOpen className="mx-auto h-16 w-16 mb-4" style={{ color: "var(--color-text-light)" }} />
                      <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--color-text)" }}>
                        No resources found
                      </h3>
                      <p style={{ color: "var(--color-text-light)" }}>Try adjusting your search or category filters</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="featured" className="space-y-6">
                <div className="grid gap-6">
                  {featuredResources.map((resource) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      isSaved={savedResources.some((r) => r.id === resource.id)}
                      onToggleSave={toggleSaveResource}
                      getTypeIcon={getTypeIcon}
                      getTypeColor={getTypeColor}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="saved" className="space-y-6">
                {savedResources.length > 0 ? (
                  <div className="grid gap-6">
                    {savedResources.map((resource) => (
                      <ResourceCard
                        key={resource.id}
                        resource={resource}
                        isSaved={true}
                        onToggleSave={toggleSaveResource}
                        getTypeIcon={getTypeIcon}
                        getTypeColor={getTypeColor}
                      />
                    ))}
                  </div>
                ) : (
                  <Card
                    className="border shadow-lg backdrop-blur-sm transition-colors duration-300"
                    style={{
                      backgroundColor: "var(--color-background)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <CardContent className="text-center py-16">
                      <Bookmark className="mx-auto h-16 w-16 mb-4" style={{ color: "var(--color-text-light)" }} />
                      <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--color-text)" }}>
                        No saved resources yet
                      </h3>
                      <p className="mb-6" style={{ color: "var(--color-text-light)" }}>
                        Save resources to access them quickly later
                      </p>
                      <Button
                        onClick={() => {
                          const tabs = document.querySelector('[value="all"]') as HTMLElement
                          tabs?.click()
                        }}
                        className="text-white transition-all duration-300"
                        style={{
                          background: `linear-gradient(to right, var(--color-primary), var(--color-accent))`,
                          border: "none",
                        }}
                      >
                        Browse All Resources
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Category Filter */}
            <Card
              className="border shadow-lg backdrop-blur-sm transition-colors duration-300"
              style={{
                backgroundColor: "var(--color-background)",
                borderColor: "var(--color-border)",
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                  <span style={{ color: "var(--color-text)" }}>Filter by Category</span>
                </CardTitle>
                {selectedCategories.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCategories([])}
                    className="text-xs hover:opacity-80"
                    style={{ color: "var(--color-text-light)" }}
                  >
                    Clear all
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map((category) => (
                    <Badge
                      key={category}
                      variant={selectedCategories.includes(category) ? "default" : "outline"}
                      className="cursor-pointer hover:shadow-sm transition-all duration-200"
                      onClick={() => toggleCategory(category)}
                      style={
                        selectedCategories.includes(category)
                          ? {
                              backgroundColor: "var(--color-primary)",
                              color: "white",
                              borderColor: "var(--color-primary)",
                            }
                          : {
                              backgroundColor: "transparent",
                              color: "var(--color-text)",
                              borderColor: "var(--color-border)",
                            }
                      }
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Resource Types */}
            <Card
              className="border shadow-lg backdrop-blur-sm transition-colors duration-300"
              style={{
                backgroundColor: "var(--color-background)",
                borderColor: "var(--color-border)",
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
                  <span style={{ color: "var(--color-text)" }}>Resource Types</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {["Article", "Video", "Guide", "Checklist", "Tool"].map((type) => {
                    const Icon = getTypeIcon(type)
                    const count = resourcesData.filter((r) => r.type === type).length
                    return (
                      <div
                        key={type}
                        className="flex items-center justify-between p-2 rounded-lg hover:opacity-80 transition-opacity duration-300"
                        style={{ backgroundColor: "var(--color-border)30" }}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-8 h-8 bg-gradient-to-r ${getTypeColor(type)} rounded-lg flex items-center justify-center`}
                          >
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium" style={{ color: "var(--color-text)" }}>
                            {type}s
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          style={{
                            backgroundColor: "transparent",
                            color: "var(--color-text)",
                            borderColor: "var(--color-border)",
                          }}
                        >
                          {count}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Help Card */}
            <Card
              className="border shadow-lg transition-colors duration-300"
              style={{
                background: `linear-gradient(135deg, var(--color-primary)10, var(--color-accent)10)`,
                backgroundColor: "var(--color-background)",
                borderColor: "var(--color-border)",
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5 text-orange-600" />
                  <span style={{ color: "var(--color-text)" }}>Need Help?</span>
                </CardTitle>
                <CardDescription style={{ color: "var(--color-text-light)" }}>
                  Can't find what you're looking for?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4" style={{ color: "var(--color-text-light)" }}>
                  Try our AI chatbot for personalized academic transition advice and resource recommendations.
                </p>
                <Button
                  className="w-full text-white transition-all duration-300"
                  style={{
                    background: `linear-gradient(to right, var(--color-primary), var(--color-accent))`,
                    border: "none",
                  }}
                  onClick={() => setChatOpen(true)}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat with AI Assistant
                </Button>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card
              className="border shadow-lg transition-colors duration-300"
              style={{
                background: `linear-gradient(135deg, #10b98110, var(--color-primary)10)`,
                backgroundColor: "var(--color-background)",
                borderColor: "var(--color-border)",
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <span style={{ color: "var(--color-text)" }}>Community Impact</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: "var(--color-text-light)" }}>
                      Students Helped
                    </span>
                    <span className="font-bold text-green-600">5,000+</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: "var(--color-text-light)" }}>
                      Countries Covered
                    </span>
                    <span className="font-bold" style={{ color: "var(--color-primary)" }}>
                      24+
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: "var(--color-text-light)" }}>
                      Success Rate
                    </span>
                    <span className="font-bold" style={{ color: "var(--color-accent)" }}>
                      95%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Chatbot open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}

const ResourceCard = ({
  resource,
  isSaved,
  onToggleSave,
  getTypeIcon,
  getTypeColor,
}: {
  resource: Resource
  isSaved?: boolean
  onToggleSave?: (r: Resource) => void
  getTypeIcon: (type: string) => any
  getTypeColor: (type: string) => string
}) => {
  const TypeIcon = getTypeIcon(resource.type)

  return (
    <Card
      className="border shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm group"
      style={{
        backgroundColor: "var(--color-background)",
        borderColor: "var(--color-border)",
      }}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div
                className={`w-10 h-10 bg-gradient-to-r ${getTypeColor(resource.type)} rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300`}
              >
                <TypeIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle
                  className="text-xl group-hover:opacity-80 transition-colors duration-300"
                  style={{ color: "var(--color-text)" }}
                >
                  {resource.title}
                </CardTitle>
                {resource.featured && (
                  <Badge className="mt-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                    <Star className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                )}
              </div>
            </div>
            <CardDescription className="leading-relaxed" style={{ color: "var(--color-text-light)" }}>
              {resource.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {resource.categories.map((category) => (
            <Badge
              key={category}
              variant="outline"
              className="hover:opacity-80 transition-colors duration-200"
              style={{
                backgroundColor: "var(--color-border)30",
                color: "var(--color-text)",
                borderColor: "var(--color-border)",
              }}
            >
              {category}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter
        className="flex justify-between items-center pt-6 border-t"
        style={{ borderColor: "var(--color-border)" }}
      >
        {onToggleSave && (
          <Button
            variant="ghost"
            onClick={() => onToggleSave(resource)}
            className={`flex items-center space-x-2 hover:opacity-80 transition-all duration-300 ${
              isSaved ? "text-green-600 bg-green-50" : ""
            }`}
            style={!isSaved ? { color: "var(--color-text)" } : {}}
          >
            {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            <span>{isSaved ? "Saved" : "Save"}</span>
          </Button>
        )}
        {resource.href ? (
          <Link href={resource.href} target="_blank" rel="noopener">
            <Button
              className="text-white group transition-all duration-300"
              style={{
                background: `linear-gradient(to right, var(--color-primary), var(--color-accent))`,
                border: "none",
              }}
            >
              <span>View Resource</span>
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
          </Link>
        ) : (
          <Button disabled className="bg-gray-300 text-gray-500 cursor-not-allowed">
            No Link Available
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export default Resources
