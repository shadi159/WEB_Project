"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "../app/components/ui/button"
import { Input } from "../app/components/ui/input"
import { Label } from "../app/components/ui/label"
import { Card, CardContent, CardHeader } from "../app/components/ui/card"
import { Badge } from "../app/components/ui/badge"
import { useToast } from "../app/components/ui/use-toast"
import { Eye, EyeOff, Mail, Lock, ArrowRight, Globe, Users } from "lucide-react"
import Logo from "../app/components/Logo"

const SignIn = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // Call the Next.js API endpoint for sign in
      const response = await fetch("/api/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.code === "INVALID_CREDENTIALS") {
          throw new Error("Invalid email or password")
        } else {
          throw new Error(data.message || "Failed to sign in")
        }
      }

      // Store user data and token in localStorage for persistence across refreshes
      localStorage.setItem("user", JSON.stringify(data.user))
      localStorage.setItem("token", data.token)

      // Also store auth state in sessionStorage for current session
      sessionStorage.setItem("isLoggedIn", "true")

      toast({
        title: "Success!",
        description: "You have been signed in.",
      })

      // Redirect to profile page
      router.push("/Profile")
    } catch (err: any) {
      setError(err.message)
      toast({
        title: "Sign in failed",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left Side - Welcome Content */}
        <div className="hidden lg:block space-y-8">
          <div className="space-y-6">
            <Badge variant="outline" className="px-4 py-2 text-sm font-medium">
              <Globe className="w-4 h-4 mr-2" />
              International Student Platform
            </Badge>

            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent leading-tight">
              Welcome Back to Your Educational Journey
            </h1>

            <p className="text-xl text-gray-600 leading-relaxed">
              Continue your path to academic success with our comprehensive platform designed for international
              students.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Connect with Mentors</h3>
                <p className="text-sm text-gray-600">Get guidance from experienced students</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Discover Your City</h3>
                <p className="text-sm text-gray-600">Find the best places and experiences</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 pt-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">24+</div>
              <div className="text-sm text-gray-600">Countries</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-teal-600">5000+</div>
              <div className="text-sm text-gray-600">Students</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">100+</div>
              <div className="text-sm text-gray-600">Mentors</div>
            </div>
          </div>
        </div>

        {/* Right Side - Sign In Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="space-y-6 pb-8">
              <div className="text-center">
                <Logo className="mx-auto h-12 w-auto mb-6" />
                <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
                <p className="text-gray-600 mt-2">Sign in to your account to continue your academic journey</p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="remember"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <Label htmlFor="remember" className="text-gray-600 cursor-pointer">
                      Remember me
                    </Label>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 group"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Sign in</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">New to our platform?</span>
                  </div>
                </div>

                <div className="text-center">
                  <Link
                    href="/Register"
                    className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors duration-300"
                  >
                    <span>Create your account</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Mobile Stats */}
          <div className="lg:hidden mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl">
              <div className="text-2xl font-bold text-blue-600">24+</div>
              <div className="text-xs text-gray-600">Countries</div>
            </div>
            <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl">
              <div className="text-2xl font-bold text-teal-600">5000+</div>
              <div className="text-xs text-gray-600">Students</div>
            </div>
            <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl">
              <div className="text-2xl font-bold text-green-600">100+</div>
              <div className="text-xs text-gray-600">Mentors</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignIn
