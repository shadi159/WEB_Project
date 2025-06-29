import type { NextApiRequest, NextApiResponse } from "next"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"])
    return res.status(405).end()
  }

  const { searchType, country, city } = req.body

  if (!searchType || !country || !city) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" })
    }

    const prompt = `Please provide the top 10 ${searchType} in ${city}, ${country}. 
    For each place, provide the following information in JSON format:
    - name: The name of the place
    - description: A brief 2-3 sentence description
    - address: The address if known
    - rating: Estimated rating out of 5 (if known)
    - priceRange: Price range (e.g., "$", "$$", "$$$")
    - highlights: 2-3 key features or specialties

    Please format the response as a valid JSON array with exactly these fields. Do not include any additional text or formatting outside the JSON.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Gemini API error:", errorData)

      if (response.status === 429) {
        return res.status(503).json({
          error: "Daily quota exceeded. Try again tomorrow or upgrade to a paid plan.",
        })
      }

      return res.status(500).json({
        error: "AI service temporarily unavailable. Please try again later.",
      })
    }

    const data = await response.json()
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

    // Try to parse the JSON response
    try {
      // Clean the response text to extract JSON
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error("No JSON array found in response")
      }

      const places = JSON.parse(jsonMatch[0])

      // Validate the structure
      if (!Array.isArray(places) || places.length === 0) {
        throw new Error("Invalid response format")
      }

      return res.status(200).json({ places })
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError)
      console.error("Raw response:", responseText)

      // Fallback: return a structured error with the raw text
      return res.status(500).json({
        error: "Failed to parse AI response",
        rawResponse: responseText,
      })
    }
  } catch (error: any) {
    console.error("Top 10 API error:", error)
    return res.status(500).json({
      error: "Unexpected error. Please try again later.",
    })
  }
}
