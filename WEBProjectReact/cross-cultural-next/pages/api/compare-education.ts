import type { NextApiRequest, NextApiResponse } from "next"

// Define types for the comparison data structure
interface ComparisonSection {
  title: string
  homeCountry: string[]
  destinationCountry: string[]
}

interface ComparisonData {
  academicLevels: ComparisonSection
  gradingSystems: ComparisonSection
  academicCalendar: ComparisonSection
  teachingStyle: ComparisonSection
  commonChallenges: ComparisonSection
  admissionRequirements: ComparisonSection
}

// Country code to name mapping
const COUNTRY_NAMES: { [key: string]: string } = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  JP: "Japan",
  CN: "China",
  IN: "India",
  BR: "Brazil",
  IL: "Israel",
  AU: "Australia",
  NZ: "New Zealand",
  SG: "Singapore",
  KR: "South Korea",
  NL: "Netherlands",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  CH: "Switzerland",
  IT: "Italy",
}

function getCountryName(countryCode: string): string {
  return COUNTRY_NAMES[countryCode] || countryCode
}

// Enhanced prompt for better AI responses
function createComparisonPrompt(homeCountry: string, destinationCountry: string): string {
  return `As an expert education consultant, provide a comprehensive comparison between the education systems of ${homeCountry} and ${destinationCountry}. 

IMPORTANT: Return ONLY a valid JSON object with no additional text, markdown formatting, or code blocks. The response should start with { and end with }. Keep responses concise but informative.

Please structure your response as a JSON object with the following exact format:

{
  "academicLevels": {
    "title": "Academic Levels",
    "homeCountry": ["concise point about ${homeCountry} academic structure", "another point", "third point"],
    "destinationCountry": ["concise point about ${destinationCountry} academic structure", "another point", "third point"]
  },
  "gradingSystems": {
    "title": "Grading Systems", 
    "homeCountry": ["grading details for ${homeCountry}", "assessment methods", "third point"],
    "destinationCountry": ["grading details for ${destinationCountry}", "assessment methods", "third point"]
  },
  "academicCalendar": {
    "title": "Academic Calendar",
    "homeCountry": ["academic year in ${homeCountry}", "term dates", "holidays"],
    "destinationCountry": ["academic year in ${destinationCountry}", "term dates", "holidays"]
  },
  "teachingStyle": {
    "title": "Teaching Style",
    "homeCountry": ["classroom culture in ${homeCountry}", "teaching methods", "participation style"],
    "destinationCountry": ["classroom culture in ${destinationCountry}", "teaching methods", "participation style"]
  },
  "commonChallenges": {
    "title": "Common Challenges",
    "homeCountry": ["challenges for ${homeCountry} students in ${destinationCountry}", "cultural adjustments", "academic differences"],
    "destinationCountry": ["adaptation requirements for ${destinationCountry}", "common difficulties", "support available"]
  },
  "admissionRequirements": {
    "title": "Admission Requirements",
    "homeCountry": ["requirements in ${homeCountry}", "standardized tests", "application process"],
    "destinationCountry": ["international student requirements in ${destinationCountry}", "visa requirements", "language tests"]
  }
}

Each point should be 1-2 sentences maximum. Ensure the JSON is complete and properly formatted.`
}

// Fallback data generator for when AI fails
function generateFallbackData(homeCountry: string, destinationCountry: string): ComparisonData {
  return {
    academicLevels: {
      title: "Academic Levels",
      homeCountry: [
        `${homeCountry} follows a structured education system with distinct levels from primary through tertiary education.`,
        `Higher education typically includes undergraduate and graduate degree programs.`,
        `Academic progression follows standardized grade levels and age-based advancement.`,
      ],
      destinationCountry: [
        `${destinationCountry} has its own unique academic structure that may differ in duration and requirements.`,
        `University programs may have different lengths and entry requirements compared to ${homeCountry}.`,
        `Understanding the local academic hierarchy is crucial for successful integration.`,
      ],
    },
    gradingSystems: {
      title: "Grading Systems",
      homeCountry: [
        `${homeCountry} uses a specific grading scale with distinct performance indicators.`,
        `Assessment methods include various forms of evaluation throughout the academic term.`,
        `Grade point averages and cumulative assessments are standard practice.`,
      ],
      destinationCountry: [
        `${destinationCountry} employs a different grading methodology that students must understand.`,
        `Performance expectations and evaluation criteria may vary significantly.`,
        `Grade conversion and equivalency understanding is essential for academic success.`,
      ],
    },
    academicCalendar: {
      title: "Academic Calendar",
      homeCountry: [
        `${homeCountry} follows a specific academic year structure with defined terms and breaks.`,
        `Important academic dates and deadlines follow a predictable pattern.`,
        `Holiday schedules and examination periods are standardized across institutions.`,
      ],
      destinationCountry: [
        `${destinationCountry} operates on a different academic calendar system.`,
        `Term structures, break periods, and examination schedules may differ significantly.`,
        `Understanding the local academic rhythm is important for planning and preparation.`,
      ],
    },
    teachingStyle: {
      title: "Teaching Style",
      homeCountry: [
        `${homeCountry} classroom culture emphasizes specific teaching methodologies and student interaction patterns.`,
        `Assessment approaches and participation expectations follow established educational traditions.`,
        `Student-teacher relationships operate within defined cultural and academic frameworks.`,
      ],
      destinationCountry: [
        `${destinationCountry} has distinct teaching approaches and classroom dynamics.`,
        `Academic expectations and participation styles may require adjustment for international students.`,
        `Understanding local educational culture is crucial for academic integration and success.`,
      ],
    },
    commonChallenges: {
      title: "Common Challenges",
      homeCountry: [
        `Students from ${homeCountry} may face specific adaptation challenges when transitioning to international education.`,
        `Cultural and academic differences require preparation and understanding.`,
        `Language, methodology, and expectation adjustments are common transition areas.`,
      ],
      destinationCountry: [
        `Adapting to ${destinationCountry}'s education system requires understanding key differences in approach and culture.`,
        `International students commonly face challenges in academic writing, participation styles, and assessment methods.`,
        `Support systems and resources are available to help with the transition process.`,
      ],
    },
    admissionRequirements: {
      title: "Admission Requirements",
      homeCountry: [
        `${homeCountry} has established admission standards and application processes for educational institutions.`,
        `Standardized testing, academic records, and application materials follow specific requirements.`,
        `Understanding local admission criteria is important for educational planning.`,
      ],
      destinationCountry: [
        `${destinationCountry} has specific admission requirements for international students.`,
        `Visa requirements, language proficiency tests, and academic credential evaluation are typically required.`,
        `Application deadlines and documentation requirements may differ from home country standards.`,
      ],
    },
  }
}

// Clean and extract JSON from AI response
function cleanJsonString(jsonStr: string): string {
  // Remove markdown code blocks
  jsonStr = jsonStr.replace(/```json\s*/g, "").replace(/```\s*/g, "")

  // Remove any leading/trailing whitespace
  jsonStr = jsonStr.trim()

  // Remove trailing commas before closing braces/brackets
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, "$1")

  // Fix common JSON issues
  jsonStr = jsonStr.replace(/,\s*}/g, "}") // Remove trailing commas before }
  jsonStr = jsonStr.replace(/,\s*]/g, "]") // Remove trailing commas before ]

  return jsonStr
}

// Extract JSON from response with multiple strategies
function extractJsonFromResponse(response: string): string | null {
  console.log("Attempting to extract JSON from response...")

  // Strategy 1: Look for JSON in markdown code blocks
  const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  if (codeBlockMatch) {
    console.log("Found JSON in code block")
    return codeBlockMatch[1]
  }

  // Strategy 2: Look for JSON object (from first { to last })
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    console.log("Found JSON object")
    return jsonMatch[0]
  }

  // Strategy 3: Try to find JSON-like structure
  const lines = response.split("\n")
  let jsonStart = -1
  let jsonEnd = -1
  let braceCount = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith("{") && jsonStart === -1) {
      jsonStart = i
      braceCount = 1
    } else if (jsonStart !== -1) {
      for (const char of line) {
        if (char === "{") braceCount++
        if (char === "}") braceCount--
        if (braceCount === 0) {
          jsonEnd = i
          break
        }
      }
      if (braceCount === 0) break
    }
  }

  if (jsonStart !== -1 && jsonEnd !== -1) {
    console.log("Found JSON using line-by-line parsing")
    return lines.slice(jsonStart, jsonEnd + 1).join("\n")
  }

  console.log("No JSON found in response")
  return null
}

// Parse AI response with better error handling for incomplete JSON
function parseAIResponse(response: string, homeCountry: string, destinationCountry: string): ComparisonData {
  console.log("Parsing AI response...")
  console.log("Response preview:", response.substring(0, 500) + "...")

  try {
    // Extract JSON from response
    let jsonStr = extractJsonFromResponse(response)

    if (!jsonStr) {
      console.log("No JSON found in response, using fallback")
      return generateFallbackData(homeCountry, destinationCountry)
    }

    console.log("Extracted JSON preview:", jsonStr.substring(0, 200) + "...")

    // Check if JSON appears to be incomplete (common issue with AI responses)
    if (!isJsonComplete(jsonStr)) {
      console.log("JSON appears incomplete, attempting to complete it...")
      jsonStr = attemptToCompleteJson(jsonStr)
    }

    // Clean the JSON string
    const cleanedJson = cleanJsonString(jsonStr)
    console.log("Cleaned JSON preview:", cleanedJson.substring(0, 200) + "...")

    // Parse the JSON
    const parsed = JSON.parse(cleanedJson)

    // Validate the structure
    const requiredSections = [
      "academicLevels",
      "gradingSystems",
      "academicCalendar",
      "teachingStyle",
      "commonChallenges",
      "admissionRequirements",
    ]

    const isValid = requiredSections.every((section) => {
      const sectionData = parsed[section]
      return (
        sectionData &&
        sectionData.title &&
        Array.isArray(sectionData.homeCountry) &&
        Array.isArray(sectionData.destinationCountry) &&
        sectionData.homeCountry.length > 0 &&
        sectionData.destinationCountry.length > 0
      )
    })

    if (isValid) {
      console.log("Successfully parsed and validated AI response")
      return parsed as ComparisonData
    } else {
      console.log("Parsed JSON failed validation, using fallback")
      return generateFallbackData(homeCountry, destinationCountry)
    }
  } catch (error) {
    console.error("Error parsing AI response:", error)
    console.log("Full response for debugging:", response)
    return generateFallbackData(homeCountry, destinationCountry)
  }
}

// Check if JSON appears to be complete
function isJsonComplete(jsonStr: string): boolean {
  const trimmed = jsonStr.trim()

  // Basic checks for JSON completeness
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return false
  }

  // Count braces to see if they're balanced
  let braceCount = 0
  let inString = false
  let escaped = false

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === "\\") {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (!inString) {
      if (char === "{") braceCount++
      if (char === "}") braceCount--
    }
  }

  return braceCount === 0
}

// Attempt to complete incomplete JSON
function attemptToCompleteJson(jsonStr: string): string {
  let completed = jsonStr.trim()

  // If it doesn't end with }, try to complete it
  if (!completed.endsWith("}")) {
    // Find the last complete section
    const sections = [
      "academicLevels",
      "gradingSystems",
      "academicCalendar",
      "teachingStyle",
      "commonChallenges",
      "admissionRequirements",
    ]

    // Try to find where the JSON was cut off and complete it
    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i]
      const sectionIndex = completed.lastIndexOf(`"${section}"`)

      if (sectionIndex !== -1) {
        // Find the end of this section
        let braceCount = 0
        let inString = false
        let escaped = false
        const sectionStart = completed.indexOf("{", sectionIndex)

        if (sectionStart === -1) continue

        for (let j = sectionStart; j < completed.length; j++) {
          const char = completed[j]

          if (escaped) {
            escaped = false
            continue
          }

          if (char === "\\") {
            escaped = true
            continue
          }

          if (char === '"') {
            inString = !inString
            continue
          }

          if (!inString) {
            if (char === "{") braceCount++
            if (char === "}") braceCount--

            if (braceCount === 0) {
              // This section is complete, continue
              break
            }
          }
        }

        // If we're here and braceCount > 0, the section is incomplete
        if (braceCount > 0) {
          // Try to complete the current array if we're in one
          if (completed.includes('"homeCountry": [') || completed.includes('"destinationCountry": [')) {
            // Close any open string
            if (completed.match(/"[^"]*$/)) {
              completed += '"'
            }
            // Close array
            if (!completed.endsWith("]")) {
              completed += "]"
            }
            // Close the section object
            completed += "}"
          }
          break
        }
      }
    }

    // Ensure the main object is closed
    if (!completed.endsWith("}")) {
      completed += "}"
    }
  }

  return completed
}

// Function to get the current port from environment or detect it
function getCurrentPort(): string {
  // Try to get port from environment variables
  if (process.env.PORT) {
    return process.env.PORT
  }

  // Try to get Next.js port from environment
  if (process.env.NEXT_PUBLIC_PORT) {
    return process.env.NEXT_PUBLIC_PORT
  }

  // Default fallback
  return "3000"
}

// Function to call chat API with timeout and better error handling
async function callChatAPI(prompt: string, timeout = 30000): Promise<string> {
  console.log("Calling chat API with prompt length:", prompt.length)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    console.log("Timeout reached, aborting request...")
    controller.abort()
  }, timeout)

  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.NODE_ENV === "production" ? "https://your-domain.com" : `http://localhost:${getCurrentPort()}`)

    const chatUrl = `${baseUrl}/api/chat`
    console.log("Making request to:", chatUrl)

    const startTime = Date.now()
    const chatResponse = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "You are an expert education consultant specializing in international education systems. Provide accurate, detailed, and practical information to help students understand education system differences. Always return valid JSON without any markdown formatting or additional text.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        useForEducationComparison: true, // Flag to bypass platform restrictions
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const responseTime = Date.now() - startTime
    console.log(`Chat API response received in ${responseTime}ms, status:`, chatResponse.status)

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text().catch(() => "Unable to read error response")
      console.error("Chat API error response:", errorText)
      throw new Error(`Chat API failed with status: ${chatResponse.status} - ${errorText}`)
    }

    const chatData = await chatResponse.json()
    console.log("Chat API response keys:", Object.keys(chatData))

    // Check different possible response structures
    let aiResponse = null
    if (chatData.reply?.content) {
      aiResponse = chatData.reply.content
    } else if (chatData.content) {
      aiResponse = chatData.content
    } else if (chatData.message) {
      aiResponse = chatData.message
    } else if (chatData.response) {
      aiResponse = chatData.response
    } else if (typeof chatData === "string") {
      aiResponse = chatData
    }

    console.log("AI response found:", !!aiResponse)
    console.log("AI response preview:", aiResponse ? aiResponse.substring(0, 200) + "..." : "No response")

    if (!aiResponse) {
      console.error("Full chat response for debugging:", JSON.stringify(chatData, null, 2))
      throw new Error("No response content from AI - response structure: " + JSON.stringify(Object.keys(chatData)))
    }

    return aiResponse
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Chat API request timed out after " + timeout + "ms")
    }
    console.error("Chat API error details:", error)
    throw error
  }
}

// Main handler function
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("=== Education Comparison API Called ===")
  console.log("Method:", req.method)

  // Handle GET requests
  if (req.method === "GET") {
    return res.status(200).json({
      status: "healthy",
      service: "Education Comparison API",
      version: "1.0.0",
      endpoints: {
        POST: "/api/compare-education - Compare education systems between two countries",
      },
    })
  }

  // Handle POST requests
  if (req.method === "POST") {
    try {
      const { homeCountry, destinationCountry } = req.body
      console.log("Request body:", { homeCountry, destinationCountry })

      // Validate input
      if (!homeCountry || !destinationCountry) {
        console.log("Missing required countries")
        return res.status(400).json({ error: "Both home country and destination country are required" })
      }

      // Convert country codes to names
      const homeCountryName = getCountryName(homeCountry)
      const destinationCountryName = getCountryName(destinationCountry)
      console.log("Country names:", { homeCountryName, destinationCountryName })

      // Create the comparison prompt
      const prompt = createComparisonPrompt(homeCountryName, destinationCountryName)
      console.log("Generated prompt, calling chat API...")

      try {
        // Call the chat API with shorter timeout for better UX
        const aiResponse = await callChatAPI(prompt, 30000) // 30 second timeout
        console.log("Successfully got AI response, parsing...")

        // Parse the AI response
        const comparisonData = parseAIResponse(aiResponse, homeCountryName, destinationCountryName)

        // Add metadata
        const result = {
          success: true,
          data: comparisonData,
          metadata: {
            homeCountry: homeCountryName,
            destinationCountry: destinationCountryName,
            generatedAt: new Date().toISOString(),
            source: "ai-powered" as const,
          },
        }

        console.log("Returning successful AI-powered result")
        return res.status(200).json(result)
      } catch (aiError) {
        console.error("AI/Chat API Error:", aiError)
        console.log("Falling back to default data due to AI error")

        // Fall back to default data
        const fallbackData = generateFallbackData(homeCountryName, destinationCountryName)
        const errorMessage = aiError instanceof Error ? aiError.message : "Unknown AI service error"

        return res.status(200).json({
          success: false,
          data: fallbackData,
          metadata: {
            homeCountry: homeCountryName,
            destinationCountry: destinationCountryName,
            generatedAt: new Date().toISOString(),
            source: "fallback" as const,
            error: `AI service error: ${errorMessage}`,
          },
        })
      }
    } catch (error) {
      console.error("Education comparison API error:", error)

      // Return fallback data in case of error
      const errorMessage = error instanceof Error ? error.message : "Unknown service error"
      return res.status(200).json({
        success: false,
        data: generateFallbackData("United States", "United Kingdom"),
        metadata: {
          homeCountry: "United States",
          destinationCountry: "United Kingdom",
          generatedAt: new Date().toISOString(),
          source: "fallback" as const,
          error: "Service unavailable, showing general comparison",
        },
      })
    }
  }

  // Handle unsupported methods
  res.setHeader("Allow", ["GET", "POST"])
  return res.status(405).json({ error: `Method ${req.method} not allowed` })
}
