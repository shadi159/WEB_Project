"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "../app/components/ui/button"
import { Input } from "../app/components/ui/input"
import { Label } from "../app/components/ui/label"
import { Card, CardContent, CardHeader } from "../app/components/ui/card"
import { Badge } from "../app/components/ui/badge"
import { useToast } from "../app/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../app/components/ui/select"
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  MapPin,
  GraduationCap,
  ArrowRight,
  Globe,
  Users,
  CheckCircle,
  Shield,
} from "lucide-react"
import Logo from "../app/components/Logo"
import CountrySelect from "../app/components/ui/CountrySelect"
import _ from "lodash"

const Register = () => {
  // Form data state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "",
    educationalLevel: "",
  })

  // Temporary input state to store values while typing
  const [inputValues, setInputValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()
  const router = useRouter()

  // Create a debounced function for updating form data
  const debouncedSetFormData = _.debounce((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, 500)

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target

    // Update the temporary input state immediately for visual feedback
    setInputValues((prev) => ({ ...prev, [id]: value }))

    // Debounce the actual form data update
    debouncedSetFormData(id, value)
  }

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Clean up the debounce function on unmount
  useEffect(() => {
    return () => {
      debouncedSetFormData.cancel()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Call the Next.js API route directly
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          country: formData.country,
          educationalLevel: formData.educationalLevel,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle error responses
        if (data.code === "USER_EXISTS" || data.code === "DUPLICATE_KEY") {
          throw new Error("A user with this email already exists.")
        } else {
          throw new Error(data.message || "Failed to register. Please try again.")
        }
      }

      // Success case
      toast({
        title: "Account created!",
        description: "You have successfully registered.",
      })

      // Redirect to sign in page
      router.push("/SignIn")
    } catch (err: any) {
      setError(err.message)
      toast({
        title: "Registration failed",
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

      <div className="w-full max-w-7xl grid lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left Side - Welcome Content */}
        <div className="hidden lg:block space-y-8">
          <div className="space-y-6">
            <Badge variant="outline" className="px-4 py-2 text-sm font-medium">
              <Globe className="w-4 h-4 mr-2" />
              Join Our Global Community
            </Badge>

            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent leading-tight">
              Start Your Educational Journey Today
            </h1>

            <p className="text-xl text-gray-600 leading-relaxed">
              Join thousands of international students who are successfully navigating their academic transitions with
              our comprehensive platform.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Expert Mentorship</h3>
                <p className="text-sm text-gray-600">Connect with experienced mentors</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Comprehensive Resources</h3>
                <p className="text-sm text-gray-600">Access educational materials and guides</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">24/7 AI Support</h3>
                <p className="text-sm text-gray-600">Get instant help whenever you need it</p>
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

        {/* Right Side - Registration Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="space-y-6 pb-8">
              <div className="text-center">
                <Logo className="mx-auto h-12 w-auto mb-6" />
                <h2 className="text-3xl font-bold text-gray-900">Create Your Account</h2>
                <p className="text-gray-600 mt-2">
                  Join the community of global students navigating academic transitions
                </p>
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

                {/* Name Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span>First Name</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="firstName"
                        value={inputValues.firstName}
                        onChange={handleChange}
                        className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span>Last Name</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="lastName"
                        value={inputValues.lastName}
                        onChange={handleChange}
                        className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span>Email Address</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="email"
                      type="email"
                      value={inputValues.email}
                      onChange={handleChange}
                      className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Password Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center space-x-2">
                      <Lock className="w-4 h-4 text-gray-500" />
                      <span>Password</span>
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={inputValues.password}
                        onChange={handleChange}
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

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="flex items-center space-x-2">
                      <Lock className="w-4 h-4 text-gray-500" />
                      <span>Confirm Password</span>
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={inputValues.confirmPassword}
                        onChange={handleChange}
                        className="pl-10 pr-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Country and Education Level */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country" className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span>Current Country</span>
                    </Label>
                    <CountrySelect
                      id="country"
                      value={formData.country}
                      onChange={(value) => handleSelectChange("country", value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="educationalLevel" className="flex items-center space-x-2">
                      <GraduationCap className="w-4 h-4 text-gray-500" />
                      <span>Educational Level</span>
                    </Label>
                    <Select onValueChange={(value) => handleSelectChange("educationalLevel", value)}>
                      <SelectTrigger id="educationalLevel" className="h-12">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 bg-background">
                        <SelectItem value="High School">High School</SelectItem>
                        <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                        <SelectItem value="Graduate">Graduate</SelectItem>
                        <SelectItem value="PhD">PhD</SelectItem>
                        <SelectItem value="Professional">Professional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Terms and Privacy */}
                <div className="text-xs text-gray-600 bg-gray-50 p-4 rounded-lg">
                  By creating an account, you agree to our{" "}
                  <Link href="/terms" className="text-blue-600 hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </Link>
                  .
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
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">Already have an account?</span>
                  </div>
                </div>

                <div className="text-center">
                  <Link
                    href="/SignIn"
                    className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors duration-300"
                  >
                    <span>Sign in to your account</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Mobile Stats */}
          <div className="lg:hidden mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl">
              <div className="text-2xl font-bold text-blue-600">50+</div>
              <div className="text-xs text-gray-600">Countries</div>
            </div>
            <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl">
              <div className="text-2xl font-bold text-teal-600">1000+</div>
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

export default Register
