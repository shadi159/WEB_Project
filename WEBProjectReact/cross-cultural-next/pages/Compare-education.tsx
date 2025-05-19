"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../app/components/Navbar";
import { Button } from "../app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../app/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";
import CountrySelect from "../app/components/ui/CountrySelect";
import { useToast } from "../app/components/ui/use-toast";
import Link from "next/link";

// Define types for our data structure
type ComparisonItem = {
  us: string;
  uk: string;
  [key: string]: string; // Allow for other country codes
};

type ComparisonData = {
  academicLevels: ComparisonItem[];
  gradingSystems: ComparisonItem[];
  academicCalendar: ComparisonItem[];
  teachingStyle: ComparisonItem[];
  commonChallenges: ComparisonItem[];
};

type ExpandedSections = {
  academicLevels: boolean;
  gradingSystems: boolean;
  academicCalendar: boolean;
  teachingStyle: boolean;
  commonChallenges: boolean;
};

type SectionKey = keyof ExpandedSections;

const CompareEducation = () => {
  const router = useRouter();
  const { toast } = useToast();
  
  // State for selected countries
  const [homeCountry, setHomeCountry] = useState<string>("");
  const [destinationCountry, setDestinationCountry] = useState<string>("");
  
  // State for expanded sections
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    academicLevels: false,
    gradingSystems: false,
    academicCalendar: false,
    teachingStyle: false,
    commonChallenges: false
  });
  
  // Load user data from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setHomeCountry(userData.country || "");
      setDestinationCountry(userData.destination || "");
    } else {
      toast({ title: "Please sign in", description: "Redirecting to sign in..." });
      router.push("/SignIn");
    }
  }, [router, toast]);
  
  // Toggle section expansion
  const toggleSection = (section: SectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Education comparison data (simplified mock data)
  const comparisons: ComparisonData = {
    academicLevels: [
      { us: "Elementary School (K-5)", uk: "Primary School (Years 1-6)" },
      { us: "Middle School (6-8)", uk: "Secondary School (Years 7-9)" },
      { us: "High School (9-12)", uk: "Secondary School (Years 10-11) + Sixth Form (Years 12-13)" },
      { us: "Associate's Degree (2 years)", uk: "Foundation Degree (2 years)" },
      { us: "Bachelor's Degree (4 years)", uk: "Bachelor's Degree (3 years)" },
      { us: "Master's Degree (1-2 years)", uk: "Master's Degree (1 year)" },
      { us: "Doctoral Degree (PhD) (5-7 years)", uk: "Doctoral Degree (PhD) (3-4 years)" }
    ],
    gradingSystems: [
      { us: "A (90-100%): Excellent", uk: "First Class Honours (70%+): Excellent" },
      { us: "B (80-89%): Good", uk: "Upper Second Class Honours (60-69%): Very Good" },
      { us: "C (70-79%): Satisfactory", uk: "Lower Second Class Honours (50-59%): Good" },
      { us: "D (60-69%): Poor", uk: "Third Class Honours (40-49%): Satisfactory" },
      { us: "F (Below 60%): Fail", uk: "Fail (Below 40%)" },
      { us: "GPA System (0.0-4.0)", uk: "Degree Classification System" }
    ],
    academicCalendar: [
      { us: "Two semesters: Fall (Aug/Sep-Dec) and Spring (Jan-May)", uk: "Three terms: Autumn (Sep-Dec), Spring (Jan-Mar), Summer (Apr-Jun)" },
      { us: "Optional summer sessions (May-Aug)", uk: "Optional summer modules" },
      { us: "Thanksgiving, Winter, Spring breaks", uk: "Christmas, Easter, Half-term breaks" },
      { us: "Academic year: August/September to May", uk: "Academic year: September to June" }
    ],
    teachingStyle: [
      { us: "Interactive classroom discussions", uk: "Lecture-based with seminars" },
      { us: "Continuous assessment (assignments, quizzes, midterms)", uk: "Less continuous assessment, more emphasis on final exams" },
      { us: "Credit hours system", uk: "Module-based learning" },
      { us: "Broader curriculum with electives", uk: "More specialized and focused from the beginning" },
      { us: "Regular assignments throughout semester", uk: "Fewer assignments, greater weight on final assessment" }
    ],
    commonChallenges: [
      { us: "UK students: Adapting to continuous assessment", uk: "US students: Adjusting to independent study expectations" },
      { us: "UK students: Understanding US credit system", uk: "US students: Understanding UK degree classification" },
      { us: "UK students: Different terminology (e.g., 'course' vs 'module')", uk: "US students: Shorter degree programs requiring faster adaptation" },
      { us: "UK students: More frequent testing", uk: "US students: Fewer opportunities to improve grades" },
      { us: "UK students: Liberal arts requirements", uk: "US students: More specialized curriculum from start" }
    ]
  };
  
  // Function to display comparison table for a given section
  const renderComparisonTable = (section: SectionKey) => {
    const data = comparisons[section];
    if (!data) return null;
    
    const getCountryCode = (country: string): string => {
      if (country.toLowerCase().includes("united states")) return "us";
      if (country.toLowerCase().includes("united kingdom")) return "gb";
      return ""; // Default case
    };
    
    const homeCode = getCountryCode(homeCountry);
    const destCode = getCountryCode(destinationCountry);
    
    return (
      <div className="mt-4 space-y-2">
        {data.map((item: ComparisonItem, index: number) => (
          <div key={index} className="grid grid-cols-2 gap-4 p-3 border rounded-md bg-gray-50">
            <div>
              <p className="text-sm">{item[homeCode] || item.us}</p>
            </div>
            <div>
              <p className="text-sm">{item[destCode] || item.uk}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-origin-padding bg-gradient-to-b from-gray-50 to-gray-100">
      <Navbar />
      
      <main className="container py-6 px-6">
        <div className="mb-8">
          <h1 className="font-bold text-3xl mb-2">Education System Comparison</h1>
          <p className="text-muted-foreground">
            Compare education systems between different countries to better understand your academic transition
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <div>
            <h2 className="text-lg font-medium mb-2">Your Home Education System</h2>
            <CountrySelect
              id="homeCountry"
              value={homeCountry}
              onChange={(value) => setHomeCountry(value)}
            />
          </div>
          <div>
            <h2 className="text-lg font-medium mb-2">Your Destination Education System</h2>
            <CountrySelect
              id="destinationCountry"
              value={destinationCountry}
              onChange={(value) => setDestinationCountry(value)}
            />
          </div>
        </div>
        
        <div className="bg-blue-500 text-white p-4 rounded-md mb-6">
          <div className="flex items-center">
            <div className="font-bold flex-1">
              <span className="mr-2">{homeCountry || "United States"}</span>
              <span className="mx-2">→</span>
              <span>{destinationCountry || "United Kingdom"} Comparison</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          {/* Academic Levels Section */}
          <Card>
            <div 
              className="flex justify-between items-center p-4 cursor-pointer"
              onClick={() => toggleSection("academicLevels")}
            >
              <CardTitle>Academic Levels</CardTitle>
              {expandedSections.academicLevels ? <ChevronDown /> : <ChevronRight />}
            </div>
            {expandedSections.academicLevels && (
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="font-medium">{homeCountry || "United States"}</div>
                  <div className="font-medium">{destinationCountry || "United Kingdom"}</div>
                </div>
                {renderComparisonTable("academicLevels")}
              </CardContent>
            )}
          </Card>
          
          {/* Grading Systems Section */}
          <Card>
            <div 
              className="flex justify-between items-center p-4 cursor-pointer"
              onClick={() => toggleSection("gradingSystems")}
            >
              <CardTitle>Grading Systems</CardTitle>
              {expandedSections.gradingSystems ? <ChevronDown /> : <ChevronRight />}
            </div>
            {expandedSections.gradingSystems && (
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="font-medium">{homeCountry || "United States"}</div>
                  <div className="font-medium">{destinationCountry || "United Kingdom"}</div>
                </div>
                {renderComparisonTable("gradingSystems")}
              </CardContent>
            )}
          </Card>
          
          {/* Academic Calendar Section */}
          <Card>
            <div 
              className="flex justify-between items-center p-4 cursor-pointer"
              onClick={() => toggleSection("academicCalendar")}
            >
              <CardTitle>Academic Calendar</CardTitle>
              {expandedSections.academicCalendar ? <ChevronDown /> : <ChevronRight />}
            </div>
            {expandedSections.academicCalendar && (
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="font-medium">{homeCountry || "United States"}</div>
                  <div className="font-medium">{destinationCountry || "United Kingdom"}</div>
                </div>
                {renderComparisonTable("academicCalendar")}
              </CardContent>
            )}
          </Card>
          
          {/* Teaching Style Section */}
          <Card>
            <div 
              className="flex justify-between items-center p-4 cursor-pointer"
              onClick={() => toggleSection("teachingStyle")}
            >
              <CardTitle>Teaching Style</CardTitle>
              {expandedSections.teachingStyle ? <ChevronDown /> : <ChevronRight />}
            </div>
            {expandedSections.teachingStyle && (
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="font-medium">{homeCountry || "United States"}</div>
                  <div className="font-medium">{destinationCountry || "United Kingdom"}</div>
                </div>
                {renderComparisonTable("teachingStyle")}
              </CardContent>
            )}
          </Card>
          
          {/* Common Challenges Section */}
          <Card>
            <div 
              className="flex justify-between items-center p-4 cursor-pointer"
              onClick={() => toggleSection("commonChallenges")}
            >
              <CardTitle>Common Challenges</CardTitle>
              {expandedSections.commonChallenges ? <ChevronDown /> : <ChevronRight />}
            </div>
            {expandedSections.commonChallenges && (
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="font-medium">{homeCountry || "United States"}</div>
                  <div className="font-medium">{destinationCountry || "United Kingdom"}</div>
                </div>
                {renderComparisonTable("commonChallenges")}
              </CardContent>
            )}
          </Card>
        </div>
        
        <div className="mt-8 text-sm text-center text-muted-foreground">
          <p>This comparison provides a general overview. For more detailed guidance specific to your academic transition, 
          <Link href="Resources" className="text-blue-500 hover:underline ml-1">explore our resources</Link> or 
          <button className="text-blue-500 hover:underline ml-1">contact an academic advisor</button>.</p>
        </div>
        
        <div className="flex justify-center mt-6">
          <Button 
            variant="default"
            onClick={() => router.push('/Profile')}
          >
            Back to Profile
          </Button>
        </div>
      </main>
    </div>
  );
};

export default CompareEducation;