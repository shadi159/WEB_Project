// pages/community.tsx  (or wherever your Community component lives)
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Card, CardContent, CardDescription,
  CardFooter, CardHeader, CardTitle
} from "../app/components/ui/card";
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
  author: { name: string; avatar?: string; initials: string };
  content: string;
  likes: number;
  comments: number;
  shares: number;
  createdAt: string;
}

interface User {
  firstName: string;
  lastName: string;
  avatar?: string;
}

export default function Community() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // load user & posts on mount
  useEffect(() => {
    // — check login
    const stored = localStorage.getItem("user");
    if (sessionStorage.getItem("isLoggedIn") === "true" && stored) {
      setUser(JSON.parse(stored));
      setIsLoggedIn(true);
    }
    // — fetch posts
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const res = await fetch("/api/posts");
    const data = await res.json();
    setPosts(
      data.map((p: any) => ({
        id: p._id,
        author: p.author,
        content: p.content,
        likes: p.likes,
        comments: p.comments.length,
        shares: p.shares,
        createdAt: p.createdAt
      }))
    );
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !user) return;
    const author = {
      name: user.firstName + " " + user.lastName,
      avatar: user.avatar,
      initials:
        user.firstName[0].toUpperCase() + user.lastName[0].toUpperCase(),
    };
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author, content: newPost }),
    });
    if (res.ok) {
      setNewPost("");
      fetchPosts();
    }
  };

  const handleLike = async (id: string) => {
    const res = await fetch(`/api/posts/${id}/like`, { method: "POST" });
    if (res.ok) fetchPosts();
  };

  const handleComment = async (id: string) => {
    const content = prompt("Enter your comment:");
    if (!content?.trim() || !user) return;
    const author = {
      name: user.firstName + " " + user.lastName,
      initials:
        user.firstName[0].toUpperCase() + user.lastName[0].toUpperCase(),
    };
    await fetch(`/api/posts/${id}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author, content }),
    });
    fetchPosts();
  };

  const handleShare = async (id: string) => {
    try {
      await navigator.share({ text: newPost, url: window.location.href });
    } catch {
      // fallback: copy link
      await navigator.clipboard.writeText(window.location.href + `?post=${id}`);
      alert("Link copied!");
    }
    await fetch(`/api/posts/${id}/share`, { method: "POST" });
    fetchPosts();
  };

  const handleSignIn = () => router.push("/SignIn");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* sidebar omitted for brevity */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader><CardTitle>Create Post</CardTitle></CardHeader>
              <CardContent>
                {isLoggedIn ? (
                  <form onSubmit={handlePostSubmit}>
                    <div className="flex flex-col space-y-4">
                      <Input
                        placeholder="Share something…"
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
                    <p className="text-center text-muted-foreground">
                      You need to log in to post
                    </p>
                    <Button variant="outline" onClick={handleSignIn}>
                      Sign In
                    </Button>
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

              <TabsContent value="recent" className="space-y-6">
                {posts.map((post) => (
                  <Card key={post.id}>
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <Avatar>
                          {post.author.avatar ? (
                            <AvatarImage
                              src={post.author.avatar}
                              alt={post.author.name}
                            />
                          ) : (
                            <AvatarFallback>
                              {post.author.initials}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="font-medium">{post.author.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(post.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p>{post.content}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id)}
                      >
                        ❤️ {post.likes}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleComment(post.id)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {post.comments}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShare(post.id)}
                      >
                        <Share className="h-4 w-4 mr-2" />
                        {post.shares}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </TabsContent>

              {/* popular & following tabs can stay as placeholders */}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
