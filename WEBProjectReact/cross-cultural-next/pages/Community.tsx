import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../app/components/ui/card";
import { Button } from "../app/components/ui/button";
import { Input } from "../app/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../app/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../app/components/ui/tabs";
import { MessageSquare, Users, Share, LogIn } from "lucide-react";
import Navbar from "../app/components/Navbar";
import Link from "next/link";
import { useRouter } from "next/router";

interface Post {
  id: string;
  author: {
    name: string;
    avatar: string;
    initials: string;
  };
  content: string;
  likes: number;
  comments: number;
  time: string;
}

interface User {
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
}

const Community = () => {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([
    {
      id: "1",
      author: {
        name: "Sarah Johnson",
        avatar: "",
        initials: "SJ",
      },
      content: "Just completed my certification! Anyone else working on professional development this month?",
      likes: 24,
      comments: 8,
      time: "2 hours ago",
    },
    {
      id: "2",
      author: {
        name: "Michael Chen",
        avatar: "",
        initials: "MC",
      },
      content: "Looking for resources on leadership development. Any recommendations from the community?",
      likes: 15,
      comments: 12,
      time: "1 day ago",
    },
    {
      id: "3",
      author: {
        name: "Priya Singh",
        avatar: "",
        initials: "PS",
      },
      content: "Hosting a virtual meetup next week on navigating career transitions. DM me if interested!",
      likes: 32,
      comments: 5,
      time: "3 days ago",
    },
  ]);

  const [newPost, setNewPost] = useState("");
  const [user, setUser] = useState<User>({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if user is logged in on component mount
  useEffect(() => {
    const checkLoginStatus = () => {
      const storedUser = localStorage.getItem("user");
      const sessionFlag = sessionStorage.getItem("isLoggedIn");
      
      const isUserLoggedIn = sessionFlag === "true" && storedUser;
      
      setIsLoggedIn(!!isUserLoggedIn);
      
      if (isUserLoggedIn && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData && userData.firstName && userData.lastName) {
            setUser(userData);
          } else {
            setIsLoggedIn(false);
          }
        } catch (error) {
          console.error("Error parsing user data:", error);
          setIsLoggedIn(false);
        }
      } else {
        setIsLoggedIn(false);
      }
    };
    
    // Check on mount
    checkLoginStatus();
    
    // Set up an interval to periodically check login status
    const intervalId = setInterval(checkLoginStatus, 5000);
    
    return () => clearInterval(intervalId);
  }, []);

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Perform a real-time check if the user is still logged in
    const storedUser = localStorage.getItem("user");
    const sessionFlag = sessionStorage.getItem("isLoggedIn");
    const currentlyLoggedIn = (sessionFlag === "true" && storedUser);
    
    // Don't proceed if not logged in or post is empty
    if (!currentlyLoggedIn || !newPost.trim()) {
      // If they somehow got here while logged out, update the UI state
      if (!currentlyLoggedIn && isLoggedIn) {
        setIsLoggedIn(false);
      }
      alert("You must be logged in to post. Please sign in.");
      return;
    }
    
    // Parse user data for post creation
    let userData;
    try {
      userData = JSON.parse(storedUser || "{}");
    } catch (error) {
      console.error("Error parsing user data:", error);
      alert("There was an error with your account. Please sign in again.");
      setIsLoggedIn(false);
      return;
    }
    
    // Create the initials safely
    const getInitial = (name: string): string => {
      return name && typeof name === 'string' && name.trim() ? name.trim()[0].toUpperCase() : '';
    };
    
    const post: Post = {
      id: Date.now().toString(),
      author: {
        name: `${userData.firstName} ${userData.lastName}`,
        avatar: userData.avatar || "",
        initials: getInitial(userData.firstName) + getInitial(userData.lastName),
      },
      content: newPost,
      likes: 0,
      comments: 0,
      time: "Just now",
    };

    setPosts([post, ...posts]);
    setNewPost("");
  };
    
  const handleSignIn = () => {
    router.push("/SignIn");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Community</CardTitle>
                <CardDescription>Connect with other members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Users className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <p className="font-medium">1,243 Members</p>
                      <p className="text-sm text-muted-foreground">Active community</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <MessageSquare className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <p className="font-medium">56 New Posts</p>
                      <p className="text-sm text-muted-foreground">Since your last visit</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Invite Members</Button>
              </CardFooter>
            </Card>
          </div>

          {/* Main content */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Create Post</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoggedIn ? (
                  <form onSubmit={handlePostSubmit}>
                    <div className="flex flex-col space-y-4">
                      <Input
                        placeholder="Share something with the community..."
                        value={newPost}
                        onChange={(e) => setNewPost(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <Button type="submit" disabled={!newPost.trim()}>
                        Post
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col items-center space-y-4 py-4">
                    <LogIn className="h-12 w-12 text-muted-foreground" />
                    <p className="text-center text-muted-foreground">You need to be logged in to create a post</p>
                    <Button variant="outline" onClick={handleSignIn}>Sign In</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue="recent">
              <TabsList className="mb-6">
                <TabsTrigger value="recent">Recent Posts</TabsTrigger>
                <TabsTrigger value="popular">Popular</TabsTrigger>
                <TabsTrigger value="following">Following</TabsTrigger>
              </TabsList>

              <TabsContent value="recent" className="space-y-6 animate-fade-in">
                {posts.map((post) => (
                  <Card key={post.id}>
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <Avatar>
                          {post.author.avatar ? (
                            <AvatarImage src={post.author.avatar} alt={post.author.name} />
                          ) : (
                            <AvatarFallback>{post.author.initials}</AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="font-medium">{post.author.name}</p>
                          <p className="text-sm text-muted-foreground">{post.time}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p>{post.content}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button variant="ghost" size="sm">
                        ❤️ {post.likes}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {post.comments}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Share className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="popular" className="space-y-6">
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Popular content will appear here</p>
                </div>
              </TabsContent>

              <TabsContent value="following" className="space-y-6">
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Content from people you follow will appear here</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Community;