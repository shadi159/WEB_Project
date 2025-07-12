"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../app/components/ui/card"
import { Button } from "../app/components/ui/button"
import { Input } from "../app/components/ui/input"
import { Textarea } from "../app/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "../app/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../app/components/ui/tabs"
import { Badge } from "../app/components/ui/badge"
import {
  MessageSquare,
  Users,
  Share,
  LogIn,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Edit,
  Trash2,
  Check,
  X,
  Heart,
  TrendingUp,
  UserPlus,
  Globe,
  Sparkles,
  Send,
  ImageIcon,
  Smile,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../app/components/ui/dropdown-menu"
import Navbar from "../app/components/Navbar"
import { useRouter } from "next/navigation"

interface Comment {
  _id?: string
  author: { name: string; avatar?: string; initials: string }
  content: string
  createdAt: string
}

interface Post {
  id: string
  author: { name: string; avatar?: string; initials: string }
  content: string
  likes: number
  comments: Comment[]
  shares: number
  createdAt: string
}

interface User {
  firstName: string
  lastName: string
  avatar?: string
}

export default function Community() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [newPost, setNewPost] = useState("")
  const [user, setUser] = useState<User | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())

  // Edit states
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editPostContent, setEditPostContent] = useState("")
  const [editCommentContent, setEditCommentContent] = useState("")

  // Load user & posts on mount
  useEffect(() => {
    // Check login
    const stored = localStorage.getItem("user")
    if (sessionStorage.getItem("isLoggedIn") === "true" && stored) {
      setUser(JSON.parse(stored))
      setIsLoggedIn(true)
    }

    // Fetch posts
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    const res = await fetch("/api/posts")
    const data = await res.json()
    setPosts(
      data.map((p: any) => ({
        id: p._id,
        author: p.author,
        content: p.content,
        likes: p.likes,
        comments: p.comments || [],
        shares: p.shares,
        createdAt: p.createdAt,
      })),
    )
  }

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPost.trim() || !user) return

    const author = {
      name: user.firstName + " " + user.lastName,
      avatar: user.avatar,
      initials: user.firstName[0].toUpperCase() + user.lastName[0].toUpperCase(),
    }

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author, content: newPost }),
    })

    if (res.ok) {
      setNewPost("")
      fetchPosts()
    }
  }

  const handleLike = async (id: string) => {
    const res = await fetch(`/api/posts/${id}/like`, { method: "POST" })
    if (res.ok) {
      setLikedPosts((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(id)) {
          newSet.delete(id)
        } else {
          newSet.add(id)
        }
        return newSet
      })
      fetchPosts()
    }
  }

  const handleComment = async (id: string) => {
    const content = commentInputs[id]
    if (!content?.trim() || !user) return

    const author = {
      name: user.firstName + " " + user.lastName,
      initials: user.firstName[0].toUpperCase() + user.lastName[0].toUpperCase(),
    }

    const res = await fetch(`/api/posts/${id}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author, content }),
    })

    if (res.ok) {
      setCommentInputs((prev) => ({ ...prev, [id]: "" }))
      fetchPosts()
    }
  }

  const handleShare = async (id: string) => {
    try {
      await navigator.share({ text: newPost, url: window.location.href })
    } catch {
      await navigator.clipboard.writeText(window.location.href + `?post=${id}`)
      alert("Link copied!")
    }
    await fetch(`/api/posts/${id}/share`, { method: "POST" })
    fetchPosts()
  }

  // Edit/delete functions
  const handleEditPost = (post: Post) => {
    setEditingPost(post.id)
    setEditPostContent(post.content)
  }

  const handleSavePost = async (postId: string) => {
    if (!editPostContent.trim()) return
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editPostContent }),
      })
      if (res.ok) {
        setEditingPost(null)
        setEditPostContent("")
        fetchPosts()
      } else {
        const error = await res.json()
        console.error("Edit failed:", error)
        alert(`Failed to edit post: ${error.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Edit error:", error)
      alert("Failed to edit post")
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        fetchPosts()
      } else {
        const error = await res.json()
        console.error("Delete failed:", error)
        alert(`Failed to delete post: ${error.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Delete error:", error)
      alert("Failed to delete post")
    }
  }

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment._id || "")
    setEditCommentContent(comment.content)
  }

  const handleSaveComment = async (postId: string, commentId: string) => {
    if (!editCommentContent.trim()) return
    try {
      const res = await fetch(`/api/posts/${postId}/comment/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editCommentContent }),
      })
      if (res.ok) {
        setEditingComment(null)
        setEditCommentContent("")
        fetchPosts()
      } else {
        const error = await res.json()
        console.error("Edit comment failed:", error)
        alert(`Failed to edit comment: ${error.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Edit comment error:", error)
      alert("Failed to edit comment")
    }
  }

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return
    try {
      const res = await fetch(`/api/posts/${postId}/comment/${commentId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        fetchPosts()
      } else {
        const error = await res.json()
        console.error("Delete comment failed:", error)
        alert(`Failed to delete comment: ${error.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Delete comment error:", error)
      alert("Failed to delete comment")
    }
  }

  const cancelEdit = () => {
    setEditingPost(null)
    setEditingComment(null)
    setEditPostContent("")
    setEditCommentContent("")
  }

  const handleSignIn = () => router.push("/SignIn")

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
      } else {
        newSet.add(postId)
      }
      return newSet
    })
  }

  const updateCommentInput = (postId: string, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [postId]: value }))
  }

  const isPostOwner = (post: Post) => {
    return user && post.author.name === `${user.firstName} ${user.lastName}`
  }

  const isCommentOwner = (comment: Comment) => {
    return user && comment.author.name === `${user.firstName} ${user.lastName}`
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: "var(--color-background)" }}>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-12">
          <div className="text-center">
            <Badge
              variant="outline"
              className="mb-4 px-4 py-2 text-sm font-medium transition-colors duration-300"
              style={{
                backgroundColor: "var(--color-background)",
                color: "var(--color-text)",
                borderColor: "var(--color-border)",
              }}
            >
              <Users className="w-4 h-4 mr-2" />
              Student Community
            </Badge>
            <h1
              className="text-4xl font-bold bg-gradient-to-r bg-clip-text text-transparent mb-4"
              style={{
                backgroundImage: `linear-gradient(to right, var(--color-primary), var(--color-accent))`,
              }}
            >
              Connect & Share
            </h1>
            <p className="text-xl max-w-2xl mx-auto" style={{ color: "var(--color-text-light)" }}>
              Join the conversation with fellow international students from around the world
            </p>
          </div>
          {/* Community Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <Card
              className="border shadow-sm backdrop-blur-sm transition-colors duration-300"
              style={{
                backgroundColor: "var(--color-background)",
                borderColor: "var(--color-border)",
              }}
            >
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>
                  {posts.length}
                </div>
                <div className="text-sm" style={{ color: "var(--color-text-light)" }}>
                  Posts
                </div>
              </CardContent>
            </Card>
            <Card
              className="border shadow-sm backdrop-blur-sm transition-colors duration-300"
              style={{
                backgroundColor: "var(--color-background)",
                borderColor: "var(--color-border)",
              }}
            >
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">24+</div>
                <div className="text-sm" style={{ color: "var(--color-text-light)" }}>
                  Countries
                </div>
              </CardContent>
            </Card>
            <Card
              className="border shadow-sm backdrop-blur-sm transition-colors duration-300"
              style={{
                backgroundColor: "var(--color-background)",
                borderColor: "var(--color-border)",
              }}
            >
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">24/7</div>
                <div className="text-sm" style={{ color: "var(--color-text-light)" }}>
                  Active
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Profile Card */}
            {isLoggedIn && user && (
              <Card
                className="border shadow-lg backdrop-blur-sm transition-colors duration-300"
                style={{
                  backgroundColor: "var(--color-background)",
                  borderColor: "var(--color-border)",
                }}
              >
                <CardHeader className="text-center">
                  <Avatar className="w-16 h-16 mx-auto mb-3 ring-4" style={{ borderColor: "var(--color-border)" }}>
                    <AvatarImage src={user.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="text-lg text-white" style={{ backgroundColor: "var(--color-primary)" }}>
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-lg" style={{ color: "var(--color-text)" }}>
                    {user.firstName} {user.lastName}
                  </CardTitle>
                  <CardDescription style={{ color: "var(--color-text-light)" }}>Community Member</CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Create Post Card */}
            <Card
              className="mb-8 border shadow-lg backdrop-blur-sm transition-colors duration-300"
              style={{
                backgroundColor: "var(--color-background)",
                borderColor: "var(--color-border)",
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                  <span style={{ color: "var(--color-text)" }}>Share Your Experience</span>
                </CardTitle>
                <CardDescription style={{ color: "var(--color-text-light)" }}>
                  Connect with fellow students and share your journey
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoggedIn ? (
                  <form onSubmit={handlePostSubmit} className="space-y-4">
                    <div className="flex items-start space-x-4">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user?.avatar || "/placeholder.svg"} />
                        <AvatarFallback className="text-white" style={{ backgroundColor: "var(--color-primary)" }}>
                          {user?.firstName[0]}
                          {user?.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <Textarea
                          placeholder="What's on your mind? Share your study abroad experience, ask questions, or offer advice..."
                          value={newPost}
                          onChange={(e) => setNewPost(e.target.value)}
                          className="min-h-[120px] resize-none transition-colors duration-300"
                          style={{
                            backgroundColor: "var(--color-background)",
                            borderColor: "var(--color-border)",
                            color: "var(--color-text)",
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" type="button" style={{ color: "var(--color-text)" }}>
                          <Smile className="w-4 h-4 mr-2" />
                          Emoji
                        </Button>
                      </div>
                      <Button
                        type="submit"
                        disabled={!newPost.trim()}
                        className="text-white transition-all duration-300"
                        style={{
                          background: `linear-gradient(to right, var(--color-primary), var(--color-accent))`,
                          border: "none",
                        }}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Share Post
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-8">
                    <LogIn className="h-16 w-16 mx-auto mb-4" style={{ color: "var(--color-text-light)" }} />
                    <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--color-text)" }}>
                      Join the Conversation
                    </h3>
                    <p className="mb-6" style={{ color: "var(--color-text-light)" }}>
                      Sign in to share your experiences and connect with other students
                    </p>
                    <Button
                      onClick={handleSignIn}
                      className="text-white transition-all duration-300"
                      style={{
                        background: `linear-gradient(to right, var(--color-primary), var(--color-accent))`,
                        border: "none",
                      }}
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In to Continue
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Posts Tabs */}
            <Tabs defaultValue="recent" className="space-y-6">
              <TabsList
                className="backdrop-blur-sm border shadow-sm transition-colors duration-300"
                style={{
                  backgroundColor: "var(--color-background)",
                  borderColor: "var(--color-border)",
                }}
              >
                <TabsTrigger
                  value="recent"
                  className="flex items-center space-x-2 transition-colors duration-300"
                  style={{ color: "var(--color-text)" }}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Recent Posts</span>
                </TabsTrigger>
                <TabsTrigger
                  value="popular"
                  className="flex items-center space-x-2 transition-colors duration-300"
                  style={{ color: "var(--color-text)" }}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Popular</span>
                </TabsTrigger>
                <TabsTrigger
                  value="following"
                  className="flex items-center space-x-2 transition-colors duration-300"
                  style={{ color: "var(--color-text)" }}
                >
                  <Users className="w-4 h-4" />
                  <span>Following</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="recent" className="space-y-6">
                {posts.length === 0 ? (
                  <Card
                    className="border shadow-lg backdrop-blur-sm transition-colors duration-300"
                    style={{
                      backgroundColor: "var(--color-background)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <CardContent className="text-center py-16">
                      <MessageSquare className="h-16 w-16 mx-auto mb-4" style={{ color: "var(--color-text-light)" }} />
                      <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--color-text)" }}>
                        No posts yet
                      </h3>
                      <p style={{ color: "var(--color-text-light)" }}>
                        Be the first to share something with the community!
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  posts.map((post) => (
                    <Card
                      key={post.id}
                      className="border shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm"
                      style={{
                        backgroundColor: "var(--color-background)",
                        borderColor: "var(--color-border)",
                      }}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Avatar className="w-12 h-12 ring-2" style={{ borderColor: "var(--color-border)" }}>
                              {post.author.avatar ? (
                                <AvatarImage src={post.author.avatar || "/placeholder.svg"} alt={post.author.name} />
                              ) : (
                                <AvatarFallback
                                  className="text-white"
                                  style={{ backgroundColor: "var(--color-primary)" }}
                                >
                                  {post.author.initials}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <p className="font-semibold" style={{ color: "var(--color-text)" }}>
                                {post.author.name}
                              </p>
                              <p className="text-sm flex items-center" style={{ color: "var(--color-text-light)" }}>
                                <Globe className="w-3 h-3 mr-1" />
                                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          {/* Post options menu */}
                          {isLoggedIn && isPostOwner(post) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  style={{ color: "var(--color-text)" }}
                                >
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
                            <Textarea
                              value={editPostContent}
                              onChange={(e) => setEditPostContent(e.target.value)}
                              className="min-h-[120px] resize-none transition-colors duration-300"
                              style={{
                                backgroundColor: "var(--color-background)",
                                borderColor: "var(--color-border)",
                                color: "var(--color-text)",
                              }}
                            />
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleSavePost(post.id)}
                                disabled={!editPostContent.trim()}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Save Changes
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                                style={{
                                  borderColor: "var(--color-border)",
                                  color: "var(--color-text)",
                                  backgroundColor: "transparent",
                                }}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="leading-relaxed" style={{ color: "var(--color-text)" }}>
                            {post.content}
                          </p>
                        )}
                      </CardContent>
                      <CardFooter className="flex flex-col space-y-4">
                        {/* Action Buttons */}
                        <div
                          className="flex justify-between w-full border-t pt-4"
                          style={{ borderColor: "var(--color-border)" }}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLike(post.id)}
                            className={`hover:bg-red-50 hover:text-red-600 transition-colors duration-300 ${
                              likedPosts.has(post.id) ? "text-red-600 bg-red-50" : ""
                            }`}
                            style={!likedPosts.has(post.id) ? { color: "var(--color-text)" } : {}}
                          >
                            <Heart className={`h-4 w-4 mr-2 ${likedPosts.has(post.id) ? "fill-current" : ""}`} />
                            {post.likes}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleComments(post.id)}
                            className="hover:bg-blue-50 hover:text-blue-600 transition-colors duration-300"
                            style={{ color: "var(--color-text)" }}
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
                            className="hover:bg-green-50 hover:text-green-600 transition-colors duration-300"
                            style={{ color: "var(--color-text)" }}
                          >
                            <Share className="h-4 w-4 mr-2" />
                            {post.shares}
                          </Button>
                        </div>

                        {/* Comments Section */}
                        {expandedComments.has(post.id) && (
                          <div
                            className="w-full space-y-4 pt-4 border-t"
                            style={{ borderColor: "var(--color-border)" }}
                          >
                            {/* Add Comment Input */}
                            {isLoggedIn && (
                              <div className="flex space-x-3">
                                <Avatar className="h-8 w-8">
                                  {user?.avatar ? (
                                    <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.firstName} />
                                  ) : (
                                    <AvatarFallback
                                      className="text-xs text-white"
                                      style={{ backgroundColor: "var(--color-primary)" }}
                                    >
                                      {user?.firstName[0]}
                                      {user?.lastName[0]}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div className="flex-1 flex space-x-2">
                                  <Input
                                    placeholder="Write a thoughtful comment..."
                                    value={commentInputs[post.id] || ""}
                                    onChange={(e) => updateCommentInput(post.id, e.target.value)}
                                    className="flex-1 transition-colors duration-300"
                                    style={{
                                      backgroundColor: "var(--color-background)",
                                      borderColor: "var(--color-border)",
                                      color: "var(--color-text)",
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => handleComment(post.id)}
                                    disabled={!commentInputs[post.id]?.trim()}
                                    className="text-white"
                                    style={{ backgroundColor: "var(--color-primary)", border: "none" }}
                                  >
                                    <Send className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Display Comments */}
                            <div className="space-y-4">
                              {post.comments.length === 0 ? (
                                <div
                                  className="text-center py-8 rounded-lg"
                                  style={{ backgroundColor: "var(--color-border)30" }}
                                >
                                  <MessageSquare
                                    className="h-8 w-8 mx-auto mb-2"
                                    style={{ color: "var(--color-text-light)" }}
                                  />
                                  <p className="text-sm" style={{ color: "var(--color-text-light)" }}>
                                    No comments yet. Start the conversation!
                                  </p>
                                </div>
                              ) : (
                                post.comments.map((comment, index) => (
                                  <div key={comment._id || index} className="flex space-x-3">
                                    <Avatar className="h-8 w-8">
                                      {comment.author.avatar ? (
                                        <AvatarImage
                                          src={comment.author.avatar || "/placeholder.svg"}
                                          alt={comment.author.name}
                                        />
                                      ) : (
                                        <AvatarFallback
                                          className="text-xs text-white"
                                          style={{ backgroundColor: "var(--color-accent)" }}
                                        >
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
                                            className="transition-colors duration-300"
                                            style={{
                                              backgroundColor: "var(--color-background)",
                                              borderColor: "var(--color-border)",
                                              color: "var(--color-text)",
                                            }}
                                          />
                                          <div className="flex space-x-2">
                                            <Button
                                              size="sm"
                                              onClick={() => handleSaveComment(post.id, comment._id!)}
                                              disabled={!editCommentContent.trim()}
                                              className="bg-green-600 hover:bg-green-700"
                                            >
                                              <Check className="h-3 w-3 mr-1" />
                                              Save
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={cancelEdit}
                                              style={{
                                                borderColor: "var(--color-border)",
                                                color: "var(--color-text)",
                                                backgroundColor: "transparent",
                                              }}
                                            >
                                              <X className="h-3 w-3 mr-1" />
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div
                                          className="rounded-xl px-4 py-3 relative group hover:opacity-90 transition-opacity duration-200"
                                          style={{ backgroundColor: "var(--color-border)30" }}
                                        >
                                          <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                              <p
                                                className="font-medium text-sm mb-1"
                                                style={{ color: "var(--color-text)" }}
                                              >
                                                {comment.author.name}
                                              </p>
                                              <p className="text-sm" style={{ color: "var(--color-text)" }}>
                                                {comment.content}
                                              </p>
                                            </div>
                                            {/* Comment options */}
                                            {isLoggedIn && isCommentOwner(comment) && (
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                                                    style={{ color: "var(--color-text)" }}
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
                                      <p className="text-xs px-4" style={{ color: "var(--color-text-light)" }}>
                                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
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
                  ))
                )}
              </TabsContent>

              <TabsContent value="popular" className="space-y-6">
                <Card
                  className="border shadow-lg backdrop-blur-sm transition-colors duration-300"
                  style={{
                    backgroundColor: "var(--color-background)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <CardContent className="text-center py-16">
                    <TrendingUp className="h-16 w-16 mx-auto mb-4" style={{ color: "var(--color-text-light)" }} />
                    <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--color-text)" }}>
                      Popular Posts
                    </h3>
                    <p style={{ color: "var(--color-text-light)" }}>
                      Coming soon! We're working on trending algorithms.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="following" className="space-y-6">
                <Card
                  className="border shadow-lg backdrop-blur-sm transition-colors duration-300"
                  style={{
                    backgroundColor: "var(--color-background)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <CardContent className="text-center py-16">
                    <Users className="h-16 w-16 mx-auto mb-4" style={{ color: "var(--color-text-light)" }} />
                    <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--color-text)" }}>
                      Following Feed
                    </h3>
                    <p style={{ color: "var(--color-text-light)" }}>Follow other students to see their posts here.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
