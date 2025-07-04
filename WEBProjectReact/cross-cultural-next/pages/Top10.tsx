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
        <span className="text-sm ml-1 font-medium" style={{ color: "var(--color-text-light)" }}>
          {rating.toFixed(1)}
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Full-width Navbar using your existing component */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000 }}>
        <Navbar />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Professional Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div
              className="flex items-center justify-center w-16 h-16 rounded-2xl mr-4"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              <Award className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <br />
              <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--color-text)" }}>
                Elite Location Discovery
              </h1>
              <p className="text-lg" style={{ color: "var(--color-text-light)" }}>
                Powered by Advanced AI Intelligence
              </p>
            </div>
          </div>
          <p className="text-xl max-w-3xl mx-auto leading-relaxed" style={{ color: "var(--color-text-light)" }}>
            Discover exceptional venues and destinations with our professional-grade recommendation engine. Get curated
            insights from comprehensive data analysis.
          </p>
        </div>

        {/* Professional Search Form */}
        <Card
          className="mb-12 border shadow-xl transition-colors duration-300"
          style={{
            backgroundColor: "var(--color-background)",
            borderColor: "var(--color-border)",
          }}
        >
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: "var(--color-text)" }}>
              <Search className="w-6 h-6" style={{ color: "var(--color-text-light)" }} />
              Advanced Location Search
            </CardTitle>
            <CardDescription className="text-base" style={{ color: "var(--color-text-light)" }}>
              Specify your requirements to receive personalized recommendations from our AI-powered system
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <Label
                    htmlFor="searchType"
                    className="text-sm font-semibold uppercase tracking-wide"
                    style={{ color: "var(--color-text-light)" }}
                  >
                    Category
                  </Label>
                  <Input
                    id="searchType"
                    placeholder="Restaurants, Hotels, Cafés, Bars..."
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
                    className="h-12 text-base transition-colors duration-300"
                    style={{
                      backgroundColor: "var(--color-background)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  />
                </div>
                <div className="space-y-3">
                  <Label
                    htmlFor="country"
                    className="text-sm font-semibold uppercase tracking-wide"
                    style={{ color: "var(--color-text-light)" }}
                  >
                    Country
                  </Label>
                  <Input
                    id="country"
                    placeholder="United States, United Kingdom, France..."
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
                    className="h-12 text-base transition-colors duration-300"
                    style={{
                      backgroundColor: "var(--color-background)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  />
                </div>
                <div className="space-y-3">
                  <Label
                    htmlFor="city"
                    className="text-sm font-semibold uppercase tracking-wide"
                    style={{ color: "var(--color-text-light)" }}
                  >
                    City
                  </Label>
                  <Input
                    id="city"
                    placeholder="New York, London, Paris..."
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
                    className="h-12 text-base transition-colors duration-300"
                    style={{
                      backgroundColor: "var(--color-background)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-text)",
                    }}
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
                  className="px-8 py-3 h-auto text-white font-semibold text-base rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    border: "none",
                  }}
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
                <div className="w-16 h-16 border-4 rounded-full" style={{ borderColor: "var(--color-border)" }}></div>
                <div
                  className="absolute top-0 left-0 w-16 h-16 border-4 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: "var(--color-primary)" }}
                ></div>
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--color-text)" }}>
              Processing Your Request
            </h3>
            <p className="text-lg" style={{ color: "var(--color-text-light)" }}>
              Analyzing {searchType} in {city}, {country}
            </p>
          </div>
        )}

        {/* Professional Results */}
        {hasSearched && !loading && places.length > 0 && (
          <div>
            <div className="mb-10">
              <h2 className="text-3xl font-bold mb-3" style={{ color: "var(--color-text)" }}>
                Top 10 {searchType} in {city}, {country}
              </h2>
              <p className="text-lg" style={{ color: "var(--color-text-light)" }}>
                Curated recommendations based on comprehensive analysis and user feedback
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
              {places.map((place, index) => (
                <Card
                  key={index}
                  className="border shadow-lg hover:shadow-2xl transition-all duration-300 group"
                  style={{
                    backgroundColor: "var(--color-background)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center justify-center w-8 h-8 text-white text-sm font-bold rounded-full"
                          style={{ backgroundColor: "var(--color-primary)" }}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <CardTitle
                            className="text-xl font-bold group-hover:opacity-80 transition-colors"
                            style={{ color: "var(--color-text)" }}
                          >
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
                    {place.rating && <div className="mb-3">{renderStars(place.rating)}</div>}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className="leading-relaxed text-base" style={{ color: "var(--color-text-light)" }}>
                      {place.description}
                    </CardDescription>
                    {place.address && (
                      <div
                        className="flex items-start gap-3 text-sm p-3 rounded-lg"
                        style={{ backgroundColor: "var(--color-border)50" }}
                      >
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--color-text-light)" }} />
                        <span className="font-medium" style={{ color: "var(--color-text-light)" }}>
                          {place.address}
                        </span>
                      </div>
                    )}
                    {place.highlights && place.highlights.length > 0 && (
                      <div className="space-y-3">
                        <h4
                          className="font-semibold text-sm uppercase tracking-wide"
                          style={{ color: "var(--color-text)" }}
                        >
                          Key Features
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {place.highlights.map((highlight, idx) => (
                            <span
                              key={idx}
                              className="text-xs font-medium px-3 py-1 rounded-full hover:opacity-80 transition-colors"
                              style={{
                                backgroundColor: "var(--color-border)",
                                color: "var(--color-text-light)",
                              }}
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
            <div
              className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--color-border)" }}
            >
              <Search className="w-12 h-12" style={{ color: "var(--color-text-light)" }} />
            </div>
            <h3 className="text-2xl font-semibold mb-3" style={{ color: "var(--color-text)" }}>
              No Results Found
            </h3>
            <p className="text-lg max-w-md mx-auto" style={{ color: "var(--color-text-light)" }}>
              We couldn't find any matches for your criteria. Please try adjusting your search parameters.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
