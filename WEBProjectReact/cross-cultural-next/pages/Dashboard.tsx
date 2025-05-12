
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../app/components/ui/card";
import { Progress } from "../app/components/ui/progress";
import Navbar from "../app/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../app/components/ui/tabs";
import { Button } from "../app/components/ui/button";

const Dashboard = () => {
  const [progress, setProgress] = useState(42);

  return (
    <div className="min-h-screen bg-origin-padding  bg-gradient-to-b from-gray-50 to-gray-100">
      <Navbar />
      
      <main className="container py-6 justify-items-end-center px-6">
        <div className="mb-8">
          <h1 className="font-bold text-3xl mb-2">Welcome back, Sarah!</h1>
          <p className="text-muted-foreground">
            Track your academic transition journey and access personalized resources.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Journey Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progress}%</div>
              <Progress value={progress} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                Keep going! You're making great progress.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12/28</div>
              <p className="text-xs text-muted-foreground mt-2">
                3 tasks due this week
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resources Saved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">9</div>
              <p className="text-xs text-muted-foreground mt-2">
                4 resources recommended for you
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Support Network</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5 peers</div>
              <p className="text-xs text-muted-foreground mt-2">
                3 messages unread
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Tabs defaultValue="upcoming">
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
              <TabsList className="flex flex-wrap gap-2 bg-gray-100 rounded-md">
                <TabsTrigger value="upcoming">Upcoming Tasks</TabsTrigger>
                <TabsTrigger value="recommended">Recommended</TabsTrigger>
                <TabsTrigger value="recent">Recent Activity</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="upcoming" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Complete University Application</CardTitle>
                  <CardDescription>Due in 5 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Finish your application for Oxford University, including personal statement and references.</p>
                  <Button className="mt-4 bg-blue-500 hover:bg-purple-500">Continue</Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Prepare for Language Proficiency Test</CardTitle>
                  <CardDescription>Due in 2 weeks</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Complete practice tests and review vocabulary for your upcoming IELTS exam.</p>
                  <Button className="mt-4 bg-blue-500 hover:bg-purple-500">Start Studying</Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Research Accommodation Options</CardTitle>
                  <CardDescription>Due in 3 weeks</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Explore on-campus housing and private accommodation options in your destination city.</p>
                  <Button className="mt-4 bg-blue-500 hover:bg-purple-500">Explore Options</Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="recommended" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Understanding the UK Grading System</CardTitle>
                  <CardDescription>Recommended Resource</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Learn how UK universities grade assignments and exams compared to your home country.</p>
                  <Button className="mt-4 bg-blue-500 hover:bg-purple-500">Read Article</Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Academic Writing Workshop</CardTitle>
                  <CardDescription>Virtual Event - Next Tuesday</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Join this workshop to understand expectations for academic writing in your new university.</p>
                  <Button className="mt-4 bg-blue-500 hover:bg-purple-500">Register</Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="recent" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Completed Visa Checklist</CardTitle>
                  <CardDescription>Yesterday</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>You completed all the requirements for your student visa application.</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Joined Study Group</CardTitle>
                  <CardDescription>3 days ago</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>You joined the "International Students in London" study group with 12 other students.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
