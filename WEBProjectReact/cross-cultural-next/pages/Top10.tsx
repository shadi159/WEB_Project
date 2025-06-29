"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../app/components/ui/card"
import { Button } from "../app/components/ui/button"
import { Input } from "../app/components/ui/input"
import { Label } from "../app/components/ui/label"
import { Loader2, MapPin, Star, DollarSign, Sparkles } from "lucide-react"

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

  const handleSearch = async (e: React.FormEvent) => {
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
                ? "fill-yellow-400 text-yellow-400"
                : i < rating
                  ? "fill-yellow-200 text-yellow-400"
                  : "text-gray-300"
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">{rating.toFixed(1)}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🏆 Top 10 Places Finder</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover the best places around the world! Enter what you're looking for and let AI find the top 10
            recommendations for you.
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Search for Amazing Places
            </CardTitle>
            <CardDescription>Tell us what you're looking for and where you want to find it</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="searchType">What are you looking for?</Label>
                  <Input
                    id="searchType"
                    placeholder="e.g., coffee shops, restaurants, hotels, bars..."
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    placeholder="e.g., United States, France, Japan..."
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="e.g., New York, Paris, Tokyo..."
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">{error}</div>
              )}

              <Button type="submit" disabled={loading} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Find Top 10 Places
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-indigo-600 mb-4" />
            <p className="text-lg text-gray-600">
              Searching for the best {searchType} in {city}, {country}...
            </p>
          </div>
        )}

        {/* Results */}
        {hasSearched && !loading && places.length > 0 && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                🎯 Top 10 {searchType} in {city}, {country}
              </h2>
              <p className="text-gray-600">Here are the best recommendations we found for you:</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {places.map((place, index) => (
                <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2 flex items-center gap-2">
                          <span className="bg-indigo-600 text-white text-sm font-bold px-2 py-1 rounded-full">
                            #{index + 1}
                          </span>
                          {place.name}
                        </CardTitle>
                        {place.rating && renderStars(place.rating)}
                      </div>
                      {place.priceRange && (
                        <div className="flex items-center gap-1 text-green-600 font-semibold">
                          <DollarSign className="w-4 h-4" />
                          {place.priceRange}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <CardDescription className="text-gray-700 leading-relaxed">{place.description}</CardDescription>

                    {place.address && (
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{place.address}</span>
                      </div>
                    )}

                    {place.highlights && place.highlights.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-gray-800">Highlights:</h4>
                        <div className="flex flex-wrap gap-1">
                          {place.highlights.map((highlight, idx) => (
                            <span key={idx} className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
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

        {/* No Results */}
        {hasSearched && !loading && places.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤔</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600">Try adjusting your search terms or try a different location.</p>
          </div>
        )}
      </div>
    </div>
  )
}
