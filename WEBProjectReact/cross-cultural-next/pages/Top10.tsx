"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../app/components/ui/card"
import { Button } from "../app/components/ui/button"
import { Input } from "../app/components/ui/input"
import { Label } from "../app/components/ui/label"
import { Loader2, MapPin, Star, DollarSign, Search, Award } from "lucide-react"
import Navbar from "@/app/components/Navbar"

interface Place {
  name: string
  description: string
  address?: string
  rating?: number
  priceRange?: string
  highlights?: string[]
}

export default function Top10Page() {
  const [searchType, setSearchType] = useState("")
  const [country, setCountry] = useState("")
  const [city, setCity] = useState("")
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault()

    if (!searchType.trim() || !country.trim() || !city.trim()) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)
    setError("")
    setPlaces([])
    setHasSearched(true)

    try {
      const response = await fetch("/api/top10", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchType: searchType.trim(),
          country: country.trim(),
          city: city.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch places")
      }

      setPlaces(data.places || [])
    } catch (err: any) {
      setError(err.message || "An error occurred while searching")
      console.error("Search error:", err)
    } finally {
      setLoading(false)
    }
  }

  const renderStars = (rating?: number) => {
    if (!rating) return null

    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < Math.floor(rating)
                ? "fill-amber-400 text-amber-400"
                : i < rating
                  ? "fill-amber-200 text-amber-400"
                  : "text-gray-300"
            }`}
          />
        ))}
        <span className="text-sm text-slate-600 ml-1 font-medium">{rating.toFixed(1)}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Full-width Navbar using your existing component */}
      <div className="w-full">
        <Navbar />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Professional Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl mr-4">
              <Award className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Elite Location Discovery</h1>
              <p className="text-lg text-slate-600">Powered by Advanced AI Intelligence</p>
            </div>
          </div>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Discover exceptional venues and destinations with our professional-grade recommendation engine. 
            Get curated insights from comprehensive data analysis.
          </p>
        </div>

        {/* Professional Search Form */}
        <Card className="mb-12 border-0 shadow-xl bg-white">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3 text-2xl text-slate-900">
              <Search className="w-6 h-6 text-slate-700" />
              Advanced Location Search
            </CardTitle>
            <CardDescription className="text-base text-slate-600">
              Specify your requirements to receive personalized recommendations from our AI-powered system
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="searchType" className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    Category
                  </Label>
                  <Input
                    id="searchType"
                    placeholder="Restaurants, Hotels, Cafés, Bars..."
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                    className="h-12 border-slate-200 focus:border-slate-400 focus:ring-slate-400 text-base"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="country" className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    Country
                  </Label>
                  <Input
                    id="country"
                    placeholder="United States, United Kingdom, France..."
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                    className="h-12 border-slate-200 focus:border-slate-400 focus:ring-slate-400 text-base"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="city" className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    City
                  </Label>
                  <Input
                    id="city"
                    placeholder="New York, London, Paris..."
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                    className="h-12 border-slate-200 focus:border-slate-400 focus:ring-slate-400 text-base"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-6 py-4 rounded-r-lg">
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <div className="flex justify-center pt-4">
                <Button 
                  onClick={handleSearch}
                  disabled={loading} 
                  className="px-8 py-3 h-auto bg-slate-900 hover:bg-slate-800 text-white font-semibold text-base rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-3" />
                      Generate Recommendations
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-slate-200 rounded-full"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Processing Your Request</h3>
            <p className="text-slate-600 text-lg">
              Analyzing {searchType} in {city}, {country}
            </p>
          </div>
        )}

        {/* Professional Results */}
        {hasSearched && !loading && places.length > 0 && (
          <div>
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-3">
                Top 10 {searchType} in {city}, {country}
              </h2>
              <p className="text-lg text-slate-600">
                Curated recommendations based on comprehensive analysis and user feedback
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
              {places.map((place, index) => (
                <Card key={index} className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white group">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-slate-900 text-white text-sm font-bold rounded-full">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-xl font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                            {place.name}
                          </CardTitle>
                        </div>
                      </div>
                      {place.priceRange && (
                        <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm bg-emerald-50 px-2 py-1 rounded-full">
                          <DollarSign className="w-3 h-3" />
                          {place.priceRange}
                        </div>
                      )}
                    </div>
                    {place.rating && (
                      <div className="mb-3">
                        {renderStars(place.rating)}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className="text-slate-700 leading-relaxed text-base">
                      {place.description}
                    </CardDescription>

                    {place.address && (
                      <div className="flex items-start gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-500" />
                        <span className="font-medium">{place.address}</span>
                      </div>
                    )}

                    {place.highlights && place.highlights.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-slate-800 uppercase tracking-wide">Key Features</h4>
                        <div className="flex flex-wrap gap-2">
                          {place.highlights.map((highlight, idx) => (
                            <span 
                              key={idx} 
                              className="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-full hover:bg-slate-200 transition-colors"
                            >
                              {highlight}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Professional No Results */}
        {hasSearched && !loading && places.length === 0 && !error && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
              <Search className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900 mb-3">No Results Found</h3>
            <p className="text-slate-600 text-lg max-w-md mx-auto">
              We couldn't find any matches for your criteria. Please try adjusting your search parameters.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}