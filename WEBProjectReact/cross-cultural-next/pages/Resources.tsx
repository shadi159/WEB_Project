"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../app/components/ui/tabs";
import { Button } from "../app/components/ui/button";
import { Input } from "../app/components/ui/input";
import { Badge } from "../app/components/ui/badge";
import Navbar from "../app/components/Navbar";
import { BookOpen, Search, ArrowRight } from "lucide-react";

type Resource = {
  id: number;
  title: string;
  description: string;
  type: "Article" | "Video" | "Guide" | "Checklist" | "Tool";
  categories: string[];
  featured?: boolean;
};

const resourcesData: Resource[] = [
  {
    id: 1,
    title: "Understanding Different Academic Systems",
    description: "Compare grading scales, teaching methods, and expectations across major educational systems.",
    type: "Guide",
    categories: ["Academic Systems", "Cultural Differences"],
    featured: true,
  },
  {
    id: 2,
    title: "Writing Academic Papers in Western Universities",
    description: "Learn about citation styles, plagiarism rules, and essay structure expectations.",
    type: "Article",
    categories: ["Academic Writing", "Study Skills"],
  },
  {
    id: 3,
    title: "Managing Culture Shock in a New Academic Environment",
    description: "Practical tips for adjusting to new cultural norms in your educational setting.",
    type: "Video",
    categories: ["Cultural Adjustment", "Mental Health"],
    featured: true,
  },
  {
    id: 4,
    title: "Financial Aid Options for International Students",
    description: "Overview of scholarships, grants, and work opportunities for students studying abroad.",
    type: "Guide",
    categories: ["Financial Planning", "Practical Resources"],
  },
  {
    id: 5,
    title: "Student Visa Application Checklist",
    description: "Step-by-step guidance for preparing and submitting student visa applications.",
    type: "Checklist",
    categories: ["Visa & Immigration", "Practical Resources"],
    featured: true,
  },
  {
    id: 6,
    title: "Housing Options for International Students",
    description: "Compare on-campus housing, private rentals, and homestays in different countries.",
    type: "Guide",
    categories: ["Accommodation", "Practical Resources"],
  },
  {
    id: 7,
    title: "Language Proficiency Test Preparation",
    description: "Strategies for improving your TOEFL, IELTS, or other language test scores.",
    type: "Video",
    categories: ["Language Skills", "Study Skills"],
  },
  {
    id: 8,
    title: "Building a Social Network in a New Country",
    description: "Tips for making friends and building connections in your new academic community.",
    type: "Article",
    categories: ["Social Integration", "Cultural Adjustment"],
  },
  {
    id: 9,
    title: "Understanding Healthcare Systems for International Students",
    description: "Navigate health insurance requirements and accessing medical care abroad.",
    type: "Guide",
    categories: ["Healthcare", "Practical Resources"],
  },
  {
    id: 10,
    title: "Academic Calendar Comparison Tool",
    description: "Interactive tool to compare academic year structures across different countries.",
    type: "Tool",
    categories: ["Academic Systems", "Planning"],
  },
  {
    id: 11,
    title: "Working While Studying: Rules and Regulations",
    description: "Understanding work permits and employment restrictions for international students.",
    type: "Article",
    categories: ["Employment", "Legal Rights"],
  },
  {
    id: 12,
    title: "Preparing for Graduate Studies Abroad",
    description: "Special considerations for international students pursuing master's or doctoral degrees.",
    type: "Guide",
    categories: ["Graduate Education", "Academic Planning"],
  },
];

const Resources = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [savedResources, setSavedResources] = useState<Resource[]>([]);

  const toggleSaveResource = (resource: Resource) => {
    setSavedResources((prev) =>
      prev.some((r) => r.id === resource.id)
        ? prev.filter((r) => r.id !== resource.id)
        : [...prev, resource]
    );
  };
  
  const allCategories = Array.from(
    new Set(resourcesData.flatMap((resource) => resource.categories))
  ).sort();

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const filteredResources = resourcesData.filter((resource) => {
    const matchesSearch =
      searchQuery === "" ||
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategories =
      selectedCategories.length === 0 ||
      selectedCategories.some((category) => resource.categories.includes(category));

    return matchesSearch && matchesCategories;
  });

  const featuredResources = resourcesData.filter((resource) => resource.featured);

  return (
    <div className="min-h-screen bg-origin-padding  bg-gradient-to-b from-gray-50 to-gray-100">
      <Navbar />

      <main className="container py-6 justify-items-end-center px-6">
        <div className="mb-8">
          <h1 className="font-bold text-3xl mb-2">Resource Library</h1>
          <p className="text-muted-foreground">
            Explore guides, articles, and tools to help navigate your academic transition.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <Tabs defaultValue="all">
              <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                <TabsList className="flex flex-wrap gap-2 bg-gray-100 rounded-md">
                  <TabsTrigger value="all">All Resources</TabsTrigger>
                  <TabsTrigger value="featured">Featured</TabsTrigger>
                  <TabsTrigger value="saved">Saved</TabsTrigger>
                </TabsList>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search resources..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <TabsContent value="all" className="space-y-4">
                {filteredResources.length > 0 ? (
                  filteredResources.map((resource) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      isSaved={savedResources.some((r) => r.id === resource.id)}
                      onToggleSave={toggleSaveResource}
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40" />
                    <h3 className="mt-4 text-lg font-medium">No resources found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search or category filters
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="featured" className="space-y-4">
                {featuredResources.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    isSaved={savedResources.some((r) => r.id === resource.id)}
                    onToggleSave={toggleSaveResource}
                  />                ))}
              </TabsContent>

              <TabsContent value="saved" className="space-y-4">
                {savedResources.length > 0 ? (
                  savedResources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/40" />
                    <h3 className="mt-4 text-lg font-medium">No saved resources yet</h3>
                    <p className="text-muted-foreground">
                      Save resources to access them quickly later
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div>
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle>Filter by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map((category) => (
                    <Badge
                      key={category}
                      variant={selectedCategories.includes(category) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleCategory(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-md mt-6">
              <CardHeader>
                <CardTitle>Resource Types</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {["Article", "Video", "Guide", "Checklist", "Tool"].map((type) => (
                    <li key={type} className="flex justify-between">
                      <span>{type}s</span>
                      <Badge variant="outline">
                        {resourcesData.filter((r) => r.type === type).length}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-md mt-6">
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
                <CardDescription>
                  Can't find what you're looking for?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  Our advisors can help you find resources specific to your academic transition needs.
                </p>
                <Button className="w-full mt-4 bg-blue-500 hover:bg-purple-500">
                  Contact an Advisor
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

const ResourceCard = ({
  resource,
  isSaved,
  onToggleSave,
}: {
  resource: Resource;
  isSaved?: boolean;
  onToggleSave?: (r: Resource) => void;
}) => {
  return (
    <Card className="bg-white shadow-sm hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{resource.title}</CardTitle>
            <CardDescription className="mt-1">{resource.description}</CardDescription>
          </div>
          <Badge className="bg-blue-500 hover:bg-blue-300">{resource.type}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {resource.categories.map((category) => (
            <Badge key={category} variant="outline" className="bg-muted/50">
              {category}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {onToggleSave && (
          <Button variant="secondary" onClick={() => onToggleSave(resource)}>
            {isSaved ? "Remove from saved" : "Save for later"}
          </Button>
        )}
        <Button className="gap-2 bg-blue-500 hover:bg-purple-500">
          View Resource <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default Resources;
