// pages/community.tsx
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
import { 
  MessageSquare, Users, Share, LogIn, ChevronDown, ChevronUp, 
  MoreHorizontal, Edit, Trash2, Check, X 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../app/components/ui/dropdown-menu";
import Navbar from "../app/components/Navbar";
import Link from "next/link";
import { useRouter } from "next/router";

interface Comment {
  _id?: string;
  author: { name: string; avatar?: string; initials: string };
  content: string;
  createdAt: string;
}

interface Post {
  id: string;
  author: { name: string; avatar?: string; initials: string };
  content: string;
  likes: number;
  comments: Comment[];
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
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  
  // Edit states
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState("");
  const [editCommentContent, setEditCommentContent] = useState("");

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
        comments: p.comments || [],
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
    const content = commentInputs[id];
    if (!content?.trim() || !user) return;
    
    const author = {
      name: user.firstName + " " + user.lastName,
      initials:
        user.firstName[0].toUpperCase() + user.lastName[0].toUpperCase(),
    };
    
    const res = await fetch(`/api/posts/${id}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author, content }),
    });
    
    if (res.ok) {
      setCommentInputs(prev => ({ ...prev, [id]: "" }));
      fetchPosts();
    }
  };

  const handleShare = async (id: string) => {
    try {
      await navigator.share({ text: newPost, url: window.location.href });
    } catch {
      await navigator.clipboard.writeText(window.location.href + `?post=${id}`);
      alert("Link copied!");
    }
    await fetch(`/api/posts/${id}/share`, { method: "POST" });
    fetchPosts();
  };

  // New edit/delete functions
  const handleEditPost = (post: Post) => {
    setEditingPost(post.id);
    setEditPostContent(post.content);
  };

  const handleSavePost = async (postId: string) => {
    if (!editPostContent.trim()) return;
    
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editPostContent }),
      });
      
      if (res.ok) {
        setEditingPost(null);
        setEditPostContent("");
        fetchPosts();
      } else {
        const error = await res.json();
        console.error('Edit failed:', error);
        alert(`Failed to edit post: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Edit error:', error);
      alert('Failed to edit post');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        fetchPosts();
      } else {
        const error = await res.json();
        console.error('Delete failed:', error);
        alert(`Failed to delete post: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete post');
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment._id || "");
    setEditCommentContent(comment.content);
  };

  const handleSaveComment = async (postId: string, commentId: string) => {
    if (!editCommentContent.trim()) return;
    
    try {
      const res = await fetch(`/api/posts/${postId}/comment/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editCommentContent }),
      });
      
      if (res.ok) {
        setEditingComment(null);
        setEditCommentContent("");
        fetchPosts();
      } else {
        const error = await res.json();
        console.error('Edit comment failed:', error);
        alert(`Failed to edit comment: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Edit comment error:', error);
      alert('Failed to edit comment');
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    
    try {
      const res = await fetch(`/api/posts/${postId}/comment/${commentId}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        fetchPosts();
      } else {
        const error = await res.json();
        console.error('Delete comment failed:', error);
        alert(`Failed to delete comment: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Delete comment error:', error);
      alert('Failed to delete comment');
    }
  };

  const cancelEdit = () => {
    setEditingPost(null);
    setEditingComment(null);
    setEditPostContent("");
    setEditCommentContent("");
  };

  const handleSignIn = () => router.push("/SignIn");

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const updateCommentInput = (postId: string, value: string) => {
    setCommentInputs(prev => ({ ...prev, [postId]: value }));
  };

  const isPostOwner = (post: Post) => {
    return user && post.author.name === `${user.firstName} ${user.lastName}`;
  };

  const isCommentOwner = (comment: Comment) => {
    return user && comment.author.name === `${user.firstName} ${user.lastName}`;
  };

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
                      <div className="flex items-center justify-between">
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
                        
                        {/* Post options menu */}
                        {isLoggedIn && isPostOwner(post) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleEditPost(post)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeletePost(post.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {editingPost === post.id ? (
                        <div className="space-y-4">
                          <Input
                            value={editPostContent}
                            onChange={(e) => setEditPostContent(e.target.value)}
                            className="min-h-[100px]"
                          />
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleSavePost(post.id)}
                              disabled={!editPostContent.trim()}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Save
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={cancelEdit}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p>{post.content}</p>
                      )}
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4">
                      <div className="flex justify-between w-full">
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
                          onClick={() => toggleComments(post.id)}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          {post.comments.length}
                          {expandedComments.has(post.id) ? (
                            <ChevronUp className="h-4 w-4 ml-2" />
                          ) : (
                            <ChevronDown className="h-4 w-4 ml-2" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShare(post.id)}
                        >
                          <Share className="h-4 w-4 mr-2" />
                          {post.shares}
                        </Button>
                      </div>

                      {/* Comments Section */}
                      {expandedComments.has(post.id) && (
                        <div className="w-full space-y-4 pt-4 border-t">
                          {/* Add Comment Input */}
                          {isLoggedIn && (
                            <div className="flex space-x-2">
                              <Avatar className="h-8 w-8">
                                {user?.avatar ? (
                                  <AvatarImage src={user.avatar} alt={user.firstName} />
                                ) : (
                                  <AvatarFallback className="text-xs">
                                    {user?.firstName[0]}{user?.lastName[0]}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div className="flex-1 flex space-x-2">
                                <Input
                                  placeholder="Write a comment..."
                                  value={commentInputs[post.id] || ""}
                                  onChange={(e) => updateCommentInput(post.id, e.target.value)}
                                  className="flex-1"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleComment(post.id)}
                                  disabled={!commentInputs[post.id]?.trim()}
                                >
                                  Post
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Display Comments */}
                          <div className="space-y-3">
                            {post.comments.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No comments yet. Be the first to comment!
                              </p>
                            ) : (
                              post.comments.map((comment, index) => (
                                <div key={comment._id || index} className="flex space-x-3">
                                  <Avatar className="h-8 w-8">
                                    {comment.author.avatar ? (
                                      <AvatarImage
                                        src={comment.author.avatar}
                                        alt={comment.author.name}
                                      />
                                    ) : (
                                      <AvatarFallback className="text-xs">
                                        {comment.author.initials}
                                      </AvatarFallback>
                                    )}
                                  </Avatar>
                                  <div className="flex-1 space-y-1">
                                    {editingComment === comment._id ? (
                                      <div className="space-y-2">
                                        <Input
                                          value={editCommentContent}
                                          onChange={(e) => setEditCommentContent(e.target.value)}
                                        />
                                        <div className="flex space-x-2">
                                          <Button 
                                            size="sm" 
                                            onClick={() => handleSaveComment(post.id, comment._id!)}
                                            disabled={!editCommentContent.trim()}
                                          >
                                            <Check className="h-4 w-4 mr-1" />
                                            Save
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="outline" 
                                            onClick={cancelEdit}
                                          >
                                            <X className="h-4 w-4 mr-1" />
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="bg-muted rounded-lg px-3 py-2 relative group">
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            <p className="font-medium text-sm">
                                              {comment.author.name}
                                            </p>
                                            <p className="text-sm">{comment.content}</p>
                                          </div>
                                          
                                          {/* Comment options */}
                                          {isLoggedIn && isCommentOwner(comment) && (
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button 
                                                  variant="ghost" 
                                                  size="sm" 
                                                  className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                                                >
                                                  <MoreHorizontal className="h-3 w-3" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleEditComment(comment)}>
                                                  <Edit className="h-3 w-3 mr-2" />
                                                  Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                  onClick={() => handleDeleteComment(post.id, comment._id!)}
                                                  className="text-destructive"
                                                >
                                                  <Trash2 className="h-3 w-3 mr-2" />
                                                  Delete
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    <p className="text-xs text-muted-foreground px-3">
                                      {formatDistanceToNow(new Date(comment.createdAt), {
                                        addSuffix: true,
                                      })}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
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