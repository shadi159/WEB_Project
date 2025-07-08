"use client"

import Image from "next/image"
import { Card, CardContent } from "../app/components/ui/card"
import { Badge } from "../app/components/ui/badge"
import { Mail, Phone, MapPin, Users } from "lucide-react"
import Navbar from "../app/components/Navbar"

const teamMembers = [
  {
    name: "Shadi Alkeesh",
    image: "/images/shadi.png",
    location: "Buqata, Golan Heights",
    phone: "+972-54-481-1751",
    email: "shadikeesha@gmail.com",
    about: "A passionate web developer and physicist, focused on building scalable and user-friendly applications.",
    role: "Lead Developer",
  },
  {
    name: "Lama",
    image: "/images/lama.png",
    location: "Yarka, Israel",
    phone: "+972-53-222-3283",
    email: "lama@gmail.com",
    about: "Frontend wizard and design enthusiast with a keen eye for clean UI/UX.",
    role: "Frontend Developer",
  },
  {
    name: "Ayman",
    image: "/images/ayman.png",
    location: "Yarka, Israel",
    phone: "+972-54-647-0793",
    email: "ayman@gmail.com",
    about: "Backend developer who loves working with databases and building robust APIs.",
    role: "Backend Developer",
  },
  {
    name: "Michel",
    image: "/images/michel.png",
    location: "Jerusalem, Israel",
    phone: "+972-52-751-7282",
    email: "michel@gmail.com",
    about: "Software engineer with a passion for performance and security.",
    role: "Software Engineer",
  },
  {
    name: "Sherbil",
    image: "/images/sherbil.png",
    location: "Tel Aviv, Israel",
    phone: "+972-50-249-5489",
    email: "sherbil@gmail.com",
    about: "DevOps and deployment expert ensuring our app runs smooth in production.",
    role: "DevOps Engineer",
  },
  {
    name: "Loai",
    image: "/images/loai.png",
    location: "Solam, Israel",
    phone: "+972-52-256-4014",
    email: "loai@gmail.com",
    about: "Project coordinator and testing specialist with strong communication skills.",
    role: "Project Coordinator",
  },
]

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-background">
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
            <Navbar />
        </div>

      {/* Hero Section */}
      <section className="relative py-20 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 px-4 py-2 text-sm text-secondary font-medium">
              <Users className="w-4 h-4 mr-2" />
              Meet Our Team
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent mb-6">
              The People Behind Our Platform
            </h1>

            <p className="text-xl text-secondary/100 max-w-3xl mx-auto leading-relaxed">
              Meet the passionate individuals who are dedicated to transforming international education and building
              bridges across cultures through innovative technology.
            </p>
          </div>
        </div>
      </section>

      {/* Team Grid */}
      <section className="py-20 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <Card
                key={index}
                className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white/80 backdrop-blur-sm overflow-hidden hover:-translate-y-2"
              >
                <CardContent className="p-0">
                  {/* Image Section */}
                  <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <Image
                      src={member.image || "/placeholder.svg"}
                      alt={member.name}
                      width={400}
                      height={400}
                      className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 right-4 z-20">
                      <Badge className="bg-white/90 text-gray-800 backdrop-blur-sm">{member.role}</Badge>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-6">
                    <div className="mb-4">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                        {member.name}
                      </h3>
                      <div className="flex items-center text-gray-600 mb-3">
                        <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                        <span className="text-sm">{member.location}</span>
                      </div>
                    </div>

                    <p className="text-gray-600 leading-relaxed mb-6 text-sm">{member.about}</p>

                    {/* Contact Info */}
                    <div className="space-y-3 pt-4 border-t border-gray-100">
                      <div className="flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200">
                        <Mail className="w-4 h-4 mr-3 text-blue-500" />
                        <a href={`mailto:${member.email}`} className="hover:underline">
                          {member.email}
                        </a>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200">
                        <Phone className="w-4 h-4 mr-3 text-green-500" />
                        <a href={`tel:${member.phone}`} className="hover:underline">
                          {member.phone}
                        </a>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Stats */}
      <section className="py-20 px-4 md:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-teal-600">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Our Team by the Numbers</h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              A diverse group of professionals united by a common vision
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">6</div>
              <div className="text-blue-100 text-lg">Team Members</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">5</div>
              <div className="text-blue-100 text-lg">Cities Represented</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">10+</div>
              <div className="text-blue-100 text-lg">Technologies Mastered</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">100%</div>
              <div className="text-blue-100 text-lg">Passion Driven</div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Values */}
      <section className="py-20 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-secondary mb-4">What Drives Us</h2>
            <p className="text-xl text-secondary max-w-2xl mx-auto">
              The core values that unite our team and guide our mission
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-0 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">Collaboration</h3>
                <p className="text-gray-600">
                  We believe in the power of teamwork and diverse perspectives to create innovative solutions.
                </p>
              </CardContent>
            </Card>

            <Card className="p-8 border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-0 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">Innovation</h3>
                <p className="text-gray-600">
                  We constantly push boundaries and explore new technologies to improve student experiences.
                </p>
              </CardContent>
            </Card>

            <Card className="p-8 border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-0 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">Impact</h3>
                <p className="text-gray-600">
                  Every line of code we write is aimed at making a meaningful difference in students' lives.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
