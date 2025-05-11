
import { useState } from "react";
import Link  from "next/link";
import { Button } from "../app/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../app/components/ui/tabs";
import Logo from "../app/components/Logo";
import { BookOpen, MapPin, User, ArrowRight, CheckCircle } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
          <div>
            <Logo />
          </div>

            <div className="flex items-center gap-4">
              <Link href="/SignIn">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/Register">
                <Button className="bg-brand-blue hover:bg-brand-purple">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        {/* Hero section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-white to-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Navigate Your <span className="hero-gradient">Global Academic Journey</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Your personal guide to transitioning between different educational systems around the world.
                We help students adapt, succeed, and thrive in new academic environments.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/Register">
                  <Button size="lg" variant="outline"className="bg-brand-blue hover:bg-brand-purple w-full sm:w-auto">
                    Start Your Journey
                  </Button>
                </Link>
                <Link href="/Resources">
                  <Button size="lg" variant="outline" className="bg-brand-blue hover:bg-brand-purple w-full sm:w-auto">
                    Explore Resources
                  </Button>
                </Link>
              </div>
              
              <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-brand-blue">24+</div>
                  <div className="text-sm text-muted-foreground">Countries</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-brand-purple">5,000+</div>
                  <div className="text-sm text-muted-foreground">Students</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-brand-orange">200+</div>
                  <div className="text-sm text-muted-foreground">Resources</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-brand-blue">97%</div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Features section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">How We Help You Succeed</h2>
              <p className="text-muted-foreground">
                Our platform provides comprehensive support throughout your entire academic transition journey.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-t-4 border-t-brand-blue">
                <CardHeader>
                  <MapPin className="h-10 w-10 text-brand-blue mb-2" />
                  <CardTitle>Guided Journey</CardTitle>
                  <CardDescription>
                    Step-by-step guidance tailored to your specific academic transition needs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-brand-blue" />
                      <span>Personalized roadmap</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-brand-blue" />
                      <span>Progress tracking</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-brand-blue" />
                      <span>Milestone achievements</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/Journey" className="text-brand-blue hover:text-brand-purple font-medium inline-flex items-center gap-1">
                    Learn more <ArrowRight className="h-4 w-4" />
                  </Link>
                </CardFooter>
              </Card>
              
              <Card className="border-t-4 border-t-brand-purple">
                <CardHeader>
                  <BookOpen className="h-10 w-10 text-brand-purple mb-2" />
                  <CardTitle>Educational Resources</CardTitle>
                  <CardDescription>
                    Comprehensive resources to help you understand different educational systems
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-brand-purple" />
                      <span>System comparison guides</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-brand-purple" />
                      <span>Cultural adaptation tips</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-brand-purple" />
                      <span>Academic success strategies</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/Resources" className="text-brand-purple hover:text-brand-blue font-medium inline-flex items-center gap-1">
                    Explore resources <ArrowRight className="h-4 w-4" />
                  </Link>
                </CardFooter>
              </Card>
              
              <Card className="border-t-4 border-t-brand-orange">
                <CardHeader>
                  <User className="h-10 w-10 text-brand-orange mb-2" />
                  <CardTitle>Community Support</CardTitle>
                  <CardDescription>
                    Connect with peers who are navigating similar academic transitions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-brand-orange" />
                      <span>Peer mentorship</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-brand-orange" />
                      <span>Cultural exchange</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-brand-orange" />
                      <span>Student success stories</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/community" className="text-brand-orange hover:text-brand-blue font-medium inline-flex items-center gap-1">
                    Join community <ArrowRight className="h-4 w-4" />
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>
        
        {/* Testimonials section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Student Success Stories</h2>
              <p className="text-muted-foreground">
                Hear from students who successfully navigated their academic transitions
              </p>
            </div>
            
            <Tabs defaultValue="undergrad" className="max-w-4xl mx-auto">
              <div className="flex justify-center mb-8">
                <TabsList>
                  <TabsTrigger value="undergrad">Undergraduate</TabsTrigger>
                  <TabsTrigger value="graduate">Graduate</TabsTrigger>
                  <TabsTrigger value="phd">PhD</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="undergrad">
                <div className="bg-white p-8 rounded-lg shadow-sm">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="md:w-1/3 flex justify-center">
                      <div className="w-32 h-32 rounded-full bg-brand-blue/20 flex items-center justify-center">
                        <span className="text-3xl font-bold text-brand-blue">MK</span>
                      </div>
                    </div>
                    <div className="md:w-2/3">
                      <p className="italic text-lg mb-4">
                        "GlobEdu was instrumental in helping me transition from the Indian education system to studying in the UK. The resources on academic writing and cultural differences made a huge impact on my success."
                      </p>
                      <div className="font-bold">Mira Kapoor</div>
                      <div className="text-sm text-muted-foreground">Computer Science Student, London</div>
                      <div className="flex items-center mt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg key={star} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="graduate">
                <div className="bg-white p-8 rounded-lg shadow-sm">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="md:w-1/3 flex justify-center">
                      <div className="w-32 h-32 rounded-full bg-brand-purple/20 flex items-center justify-center">
                        <span className="text-3xl font-bold text-brand-purple">JR</span>
                      </div>
                    </div>
                    <div className="md:w-2/3">
                      <p className="italic text-lg mb-4">
                        "As a French student pursuing an MBA in the United States, I faced many challenges with different teaching methods and expectations. GlobEdu's journey planning helped me prepare and adapt quickly."
                      </p>
                      <div className="font-bold">Jean Rousseau</div>
                      <div className="text-sm text-muted-foreground">MBA Student, Chicago</div>
                      <div className="flex items-center mt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg key={star} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="phd">
                <div className="bg-white p-8 rounded-lg shadow-sm">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="md:w-1/3 flex justify-center">
                      <div className="w-32 h-32 rounded-full bg-brand-orange/20 flex items-center justify-center">
                        <span className="text-3xl font-bold text-brand-orange">LZ</span>
                      </div>
                    </div>
                    <div className="md:w-2/3">
                      <p className="italic text-lg mb-4">
                        "Transitioning from China to Australia for my PhD in Environmental Science was daunting. The resources and community support at GlobEdu were invaluable, especially for understanding research methodology differences."
                      </p>
                      <div className="font-bold">Li Zhang</div>
                      <div className="text-sm text-muted-foreground">PhD Researcher, Sydney</div>
                      <div className="flex items-center mt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg key={star} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
        
        {/* CTA section */}
        <section className="py-16 bg-gradient-to-r from-brand-blue to-brand-purple text-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Start Your Academic Journey?</h2>
              <p className="text-xl opacity-90 mb-8">
                Join thousands of students who have successfully navigated their cross-cultural academic transitions.
              </p>
              <Link href="/Register">
                <Button size="lg" variant="secondary" className="bg-white text-brand-purple hover:bg-gray-100">
                  Get Started Today
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="opacity-75 hover:opacity-100">About Us</Link></li>
                <li><Link href="#" className="opacity-75 hover:opacity-100">Our Team</Link></li>
                <li><Link href="#" className="opacity-75 hover:opacity-100">Careers</Link></li>
                <li><Link href="#" className="opacity-75 hover:opacity-100">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="opacity-75 hover:opacity-100">Blog</Link></li>
                <li><Link href="#" className="opacity-75 hover:opacity-100">Guides</Link></li>
                <li><Link href="#" className="opacity-75 hover:opacity-100">Success Stories</Link></li>
                <li><Link href="#" className="opacity-75 hover:opacity-100">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="opacity-75 hover:opacity-100">Help Center</Link></li>
                <li><Link href="#" className="opacity-75 hover:opacity-100">Community</Link></li>
                <li><Link href="#" className="opacity-75 hover:opacity-100">Privacy Policy</Link></li>
                <li><Link href="#" className="opacity-75 hover:opacity-100">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Connect</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="opacity-75 hover:opacity-100">Twitter</Link></li>
                <li><Link href="#" className="opacity-75 hover:opacity-100">Facebook</Link></li>
                <li><Link href="#" className="opacity-75 hover:opacity-100">LinkedIn</Link></li>
                <li><Link href="#" className="opacity-75 hover:opacity-100">Instagram</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <Logo className="text-white" />
            </div>
            <div className="text-sm opacity-75">
              &copy; {new Date().getFullYear()} EduBridge. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
