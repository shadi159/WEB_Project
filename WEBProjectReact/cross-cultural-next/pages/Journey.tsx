
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import { Progress } from "../app/components/ui/progress";
import { Separator } from "../app/components/ui/separator";
import Navbar from "../app/components/Navbar";
import { CheckCircle, Circle, ArrowRight } from "lucide-react";

type JourneyStep = {
  id: number;
  title: string;
  description: string;
  tasks: {
    id: number;
    title: string;
    completed: boolean;
  }[];
  resources: {
    id: number;
    title: string;
    type: "Article" | "Video" | "Checklist" | "Guide";
  }[];
  completed: boolean;
};

const Journey = () => {
  const [journeySteps, setJourneySteps] = useState<JourneyStep[]>([
    {
      id: 1,
      title: "Research & Decision Making",
      description: "Research educational systems and make informed decisions about your academic path.",
      tasks: [
        { id: 1, title: "Compare educational systems", completed: true },
        { id: 2, title: "Research potential institutions", completed: true },
        { id: 3, title: "Identify required documentation", completed: true },
        { id: 4, title: "Set academic and career goals", completed: false },
      ],
      resources: [
        { id: 1, title: "Global Education Systems Comparison", type: "Guide" },
        { id: 2, title: "How to Choose the Right University Abroad", type: "Article" },
        { id: 3, title: "Student Visa Requirements by Country", type: "Checklist" },
      ],
      completed: false,
    },
    {
      id: 2,
      title: "Application Process",
      description: "Complete applications for your chosen institutions and programs.",
      tasks: [
        { id: 1, title: "Prepare personal statement", completed: true },
        { id: 2, title: "Gather academic transcripts", completed: true },
        { id: 3, title: "Secure recommendation letters", completed: false },
        { id: 4, title: "Submit applications", completed: false },
      ],
      resources: [
        { id: 1, title: "Writing a Successful Personal Statement", type: "Guide" },
        { id: 2, title: "Application Timeline Planner", type: "Checklist" },
        { id: 3, title: "How to Request Strong Recommendation Letters", type: "Article" },
      ],
      completed: false,
    },
    {
      id: 3,
      title: "Pre-Departure Preparation",
      description: "Prepare for relocation with practical and cultural considerations.",
      tasks: [
        { id: 1, title: "Apply for student visa", completed: false },
        { id: 2, title: "Arrange accommodation", completed: false },
        { id: 3, title: "Research healthcare options", completed: false },
        { id: 4, title: "Prepare financially", completed: false },
      ],
      resources: [
        { id: 1, title: "Cultural Adjustment Guide", type: "Article" },
        { id: 2, title: "Student Accommodation Options", type: "Video" },
        { id: 3, title: "Budgeting for International Students", type: "Guide" },
      ],
      completed: false,
    },
    {
      id: 4,
      title: "Arrival & Orientation",
      description: "Navigate your arrival and orientation at your new institution.",
      tasks: [
        { id: 1, title: "Attend orientation events", completed: false },
        { id: 2, title: "Complete registration", completed: false },
        { id: 3, title: "Set up banking", completed: false },
        { id: 4, title: "Learn campus resources", completed: false },
      ],
      resources: [
        { id: 1, title: "First Week Survival Guide", type: "Checklist" },
        { id: 2, title: "Campus Resources for International Students", type: "Guide" },
        { id: 3, title: "Understanding Your New Academic System", type: "Article" },
      ],
      completed: false,
    },
    {
      id: 5,
      title: "Academic Integration",
      description: "Adapt to your new academic environment and excel in your studies.",
      tasks: [
        { id: 1, title: "Understand grading system", completed: false },
        { id: 2, title: "Learn academic expectations", completed: false },
        { id: 3, title: "Develop study strategies", completed: false },
        { id: 4, title: "Connect with academic support", completed: false },
      ],
      resources: [
        { id: 1, title: "Academic Writing in Different Cultures", type: "Article" },
        { id: 2, title: "Study Skills for International Students", type: "Video" },
        { id: 3, title: "Working with Academic Advisors", type: "Guide" },
      ],
      completed: false,
    },
  ]);

  // Calculate overall progress
  const totalTasks = journeySteps.reduce((acc, step) => acc + step.tasks.length, 0);
  const completedTasks = journeySteps.reduce(
    (acc, step) => acc + step.tasks.filter((task) => task.completed).length,
    0
  );
  const overallProgress = Math.round((completedTasks / totalTasks) * 100);

  const toggleTaskCompletion = (stepId: number, taskId: number) => {
    setJourneySteps((prevSteps) =>
      prevSteps.map((step) => {
        if (step.id === stepId) {
          const updatedTasks = step.tasks.map((task) =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
          );
          const allTasksCompleted = updatedTasks.every((task) => task.completed);
          
          return {
            ...step,
            tasks: updatedTasks,
            completed: allTasksCompleted,
          };
        }
        return step;
      })
    );
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      
      <main className="container py-6">
        <div className="mb-8">
          <h1 className="font-bold text-3xl mb-2">Your Academic Journey</h1>
          <p className="text-muted-foreground mb-4">
            Track your progress through key stages of your academic transition
          </p>
          <div className="flex items-center gap-4">
            <Progress value={overallProgress} className="flex-1" />
            <span className="text-sm font-medium">{overallProgress}% Complete</span>
          </div>
        </div>

        <div className="space-y-8">
          {journeySteps.map((step, index) => {
            const stepProgress = Math.round(
              (step.tasks.filter((task) => task.completed).length / step.tasks.length) * 100
            );
            
            return (
              <div key={step.id} className="relative">
                {index < journeySteps.length - 1 && (
                  <div className="absolute left-6 top-[4.5rem] bottom-0 w-0.5 bg-muted-foreground/20 -z-10"></div>
                )}
                
                <div className="flex gap-4 items-start">
                  <div className="mt-1.5">
                    {step.completed ? (
                      <CheckCircle className="h-12 w-12 text-brand-blue" />
                    ) : (
                      <Circle className={`h-12 w-12 ${stepProgress > 0 ? "text-brand-purple" : "text-muted-foreground/40"}`} />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <Card className="border-l-4 border-l-brand-blue">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-xl">{step.title}</CardTitle>
                            <CardDescription className="mt-1">{step.description}</CardDescription>
                          </div>
                          <div className="text-right">
                            <span className="font-bold">{stepProgress}%</span>
                            <Progress value={stepProgress} className="w-20 mt-1" />
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">Tasks</h4>
                            <ul className="space-y-2">
                              {step.tasks.map((task) => (
                                <li 
                                  key={task.id} 
                                  className="flex items-center gap-2 cursor-pointer"
                                  onClick={() => toggleTaskCompletion(step.id, task.id)}
                                >
                                  {task.completed ? (
                                    <CheckCircle className="h-5 w-5 text-brand-blue" />
                                  ) : (
                                    <Circle className="h-5 w-5 text-muted-foreground/40" />
                                  )}
                                  <span className={task.completed ? "line-through text-muted-foreground" : ""}>
                                    {task.title}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <Separator />
                          
                          <div>
                            <h4 className="font-medium mb-2">Resources</h4>
                            <ul className="grid gap-2 sm:grid-cols-2">
                              {step.resources.map((resource) => (
                                <li key={resource.id}>
                                  <Button 
                                    variant="outline" 
                                    className="w-full justify-between text-left font-normal"
                                  >
                                    <div>
                                      <span>{resource.title}</span>
                                      <span className="block text-xs text-muted-foreground">{resource.type}</span>
                                    </div>
                                    <ArrowRight className="h-4 w-4" />
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                      
                      <CardFooter>
                        <Button className="w-full bg-brand-blue hover:bg-brand-purple">
                          {step.completed ? "Review Step" : stepProgress > 0 ? "Continue Step" : "Start Step"}
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Journey;
