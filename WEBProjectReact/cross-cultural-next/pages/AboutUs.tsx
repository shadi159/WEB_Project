import { Button } from "../app/components/ui/button"
import { Card, CardContent } from "../app/components/ui/card"
import { Badge } from "../app/components/ui/badge"
import {
  Users,
  Globe,
  BookOpen,
  Target,
  MessageCircle,
  Search,
  MapPin,
  BarChart3,
  Compass,
  Brain,
  UserCheck,
} from "lucide-react"
import Navbar from "@/app/components/Navbar"
import Link from "next/link"

const AboutUs = () => {
  const stats = [
    { number: "24+", label: "Countries Supported", icon: Globe },
    { number: "5000+", label: "Active Students", icon: Users },
    { number: "100+", label: "Expert Mentors", icon: UserCheck },
    { number: "24/7", label: "AI Support", icon: Brain },
  ]

  const coreFeatures = [
    {
      icon: UserCheck,
      title: "Mentor Connect",
      description:
        "Connect with experienced mentors who understand your academic journey and can provide personalized guidance based on their own international education experience.",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: Search,
      title: "Top10 Discovery",
      description:
        "Discover the best of everything in your new city - from top restaurants in Tel Aviv to must-visit study spots. Get curated recommendations tailored to student life.",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: Users,
      title: "Student Community",
      description:
        "Join a vibrant community where international students share experiences, ask questions, and support each other through posts, discussions, and real connections.",
      color: "from-green-500 to-green-600",
    },
    {
      icon: BookOpen,
      title: "Resource Library",
      description:
        "Access comprehensive educational materials, guides, and tools covering everything from visa applications to academic writing in different cultural contexts.",
      color: "from-orange-500 to-orange-600",
    },
    {
      icon: Compass,
      title: "Journey Tracking",
      description:
        "Follow your personalized step-by-step educational journey from initial research to full academic integration, with progress tracking and milestone celebrations.",
      color: "from-indigo-500 to-indigo-600",
    },
    {
      icon: Brain,
      title: "AI Assistant",
      description:
        "Get instant, intelligent support 24/7 from our AI assistant trained specifically on international education challenges and platform navigation.",
      color: "from-pink-500 to-pink-600",
    },
    {
      icon: BarChart3,
      title: "Education Comparison",
      description:
        "Compare educational systems, grading scales, and academic expectations across different countries to make informed decisions about your studies.",
      color: "from-teal-500 to-teal-600",
    },
    {
      icon: Target,
      title: "Personal Dashboard",
      description:
        "Monitor your progress, manage your goals, track your journey milestones, and access all platform features from your personalized control center.",
      color: "from-red-500 to-red-600",
    },
  ]

  const journeySteps = [
    { step: "01", title: "Research & Planning", desc: "Use our comparison tools and resources", icon: Search },
    { step: "02", title: "Connect & Learn", desc: "Join community and find mentors", icon: Users },
    { step: "03", title: "Apply & Prepare", desc: "Track your application journey", icon: Target },
    { step: "04", title: "Arrive & Explore", desc: "Discover your new city with Top10", icon: MapPin },
    { step: "05", title: "Succeed & Thrive", desc: "Excel with ongoing AI support", icon: Brain },
  ]

  return (
    <div className="min-h-screen bg-background">
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
            <Navbar />
        </div>
      {/* Hero Section */}
      <section className="relative py-20 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-4 py-2 text-sm font-medium">
              <Globe className="w-4 h-4 mr-2" />
              Complete International Student Platform
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent mb-6">
              Your All-in-One Education Companion
            </h1>

            <p className="text-xl text-secondary/100 mb-12 max-w-3xl mx-auto leading-relaxed">
              From mentorship and community support to AI assistance and local discovery - we provide everything
              international students need to succeed in their educational journey.
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
              {stats.map((stat, index) => (
                <div key={index} className="text-center group">
                  <div className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg mb-6 group-hover:scale-105 transition-transform duration-300">
                    <stat.icon className="h-8 w-8 text-white mx-auto" />
                  </div>
                  <div className="text-3xl font-bold text-secondary mb-2">{stat.number}</div>
                  <div className="text-secondary font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-20 px-4 md:px-6 lg:px-8 bg-background/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-secondary mb-4">Comprehensive Platform Features</h2>
            <p className="text-xl text-secondary/100 max-w-2xl mx-auto">
              Eight powerful tools working together to support your international education success
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {coreFeatures.map((feature, index) => (
              <Card
                key={index}
                className="p-6 border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm group"
              >
                <CardContent className="p-0">
                  <div
                    className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300`}
                  >
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-secondary mb-4">How Our Platform Works</h2>
            <p className="text-xl text-secondary/100 max-w-2xl mx-auto">
              A seamless integration of all features to support your complete educational journey
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8 relative">
            {journeySteps.map((item, index) => (
              <div key={index} className="text-center relative group">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-teal-600 text-white rounded-full text-lg font-bold mb-6 relative z-10 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  {item.step}
                </div>
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-4 group-hover:bg-blue-200 transition-colors duration-300">
                  <item.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-secondary mb-2">{item.title}</h3>
                <p className="text-secondary/100">{item.desc}</p>

                {index < journeySteps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-blue-300 to-teal-300 transform translate-x-4 -translate-y-1/2 z-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Spotlight */}
      <section className="py-20 px-4 md:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-secondary mb-8">Why Students Choose Our Platform</h2>
              <div className="space-y-8">
                <Card className="p-6 border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-0 flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 text-lg">Real-Time Community Support</h3>
                      <p className="text-gray-600">
                        Connect with fellow students, share experiences, and get help when you need it most through our
                        active community platform.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="p-6 border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-0 flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Brain className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 text-lg">AI-Powered Assistance</h3>
                      <p className="text-gray-600">
                        Get instant answers to your questions with our specialized AI assistant trained on international
                        education challenges.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="p-6 border-0 shadow-sm bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-0 flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 text-lg">Local Discovery & Integration</h3>
                      <p className="text-gray-600">
                        Discover the best of your new city with curated Top10 lists and local recommendations from
                        fellow students.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-6">
                <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-0">
                    <UserCheck className="w-10 h-10 text-blue-600 mb-4" />
                    <h3 className="font-semibold text-gray-900 mb-2">Expert Mentorship</h3>
                    <p className="text-gray-600 text-sm">Connect with mentors who've walked your path</p>
                  </CardContent>
                </Card>

                <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-0">
                    <BarChart3 className="w-10 h-10 text-purple-600 mb-4" />
                    <h3 className="font-semibold text-gray-900 mb-2">Data-Driven Insights</h3>
                    <p className="text-gray-600 text-sm">Compare education systems with detailed analytics</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6 mt-8">
                <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-0">
                    <Compass className="w-10 h-10 text-green-600 mb-4" />
                    <h3 className="font-semibold text-gray-900 mb-2">Guided Journey</h3>
                    <p className="text-gray-600 text-sm">Step-by-step progress tracking and guidance</p>
                  </CardContent>
                </Card>

                <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-0">
                    <BookOpen className="w-10 h-10 text-orange-600 mb-4" />
                    <h3 className="font-semibold text-gray-900 mb-2">Rich Resources</h3>
                    <p className="text-gray-600 text-sm">Comprehensive library of educational materials</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-secondary mb-4">Our Mission & Vision</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <Card className="p-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-blue-100 rounded-full mr-4">
                    <Target className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">Our Mission</h3>
                </div>
                <p className="text-gray-600 text-lg leading-relaxed">
                  To eliminate barriers in international education by providing a comprehensive, integrated platform
                  that supports students from initial research through academic success, combining technology,
                  community, and human expertise.
                </p>
              </CardContent>
            </Card>

            <Card className="p-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-purple-100 rounded-full mr-4">
                    <Globe className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">Our Vision</h3>
                </div>
                <p className="text-gray-600 text-lg leading-relaxed">
                  To become the global standard for international student support, creating a world where every student
                  can pursue their educational dreams regardless of geographical or cultural boundaries.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 md:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-teal-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Transform Your Educational Journey?</h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Join our comprehensive platform and access mentorship, community support, AI assistance, local discovery,
            and everything you need for international education success.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/Register" className="px-8 py-4 text-lg bg-white text-blue-600 hover:bg-gray-50 rounded-full">Start Your Journey</Link>
            <Link href="/#" className="px-8 py-4 text-lg border-2 border-white text-white hover:bg-white hover:text-blue-600 bg-transparent rounded-full">Explore Platform</Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AboutUs
