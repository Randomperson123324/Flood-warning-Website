"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MessageCircle, Send, ThumbsUp, ThumbsDown, Reply, Info, AlertCircle, User, ChevronDown } from "lucide-react"
import { useLanguage } from "../hooks/language-context"
import { createClient } from "@supabase/supabase-js"
import { CloudflareTurnstile } from "./cloudflare-turnstile"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let supabase: any = null
let supabaseConnected = false
try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey)
    supabaseConnected = true
    console.log("[v0] Supabase client initialized successfully")
  }
} catch (error) {
  console.error("[v0] Failed to initialize Supabase client:", error)
}

interface Message {
  id: string
  user_id: string
  username: string
  content: string
  reply_to?: string
  reply_to_content?: string
  reply_to_username?: string
  created_at: string
  reactions: { [key: string]: number }
  userReaction?: string
}

interface UserProfile {
  id: string
  username: string
  email: string
  is_online: boolean
  last_seen: string
}

export function CommunityChat() {
  const { t } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin")
  const [authData, setAuthData] = useState({ email: "", password: "", username: "", turnstileToken: "" })
  const [authError, setAuthError] = useState<string | null>(null)
  const [authSuccess, setAuthSuccess] = useState<string | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
  const [showProfileSheet, setShowProfileSheet] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = (smooth = true) => {
    const container = messagesContainerRef.current
    if (container) {
      if (smooth) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        })
      } else {
        container.scrollTop = container.scrollHeight
      }
    }
  }

  useEffect(() => {
    if (!supabase) return

    // Initial data load
    loadMessages()
    loadUsers()

    // Subscriptions
    const messagesSubscription = supabase
      .channel("messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, async (payload) => {
        if (payload.eventType === "INSERT") {
          // Find username for the new message
          const user = users.find((u) => u.id === payload.new.user_id)
          setMessages((prev) => [
            ...prev,
            {
              ...payload.new,
              username: user?.username || "Unknown",
              reactions: {},
            },
          ])
        }
        if (payload.eventType === "UPDATE")
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.new.id ? { ...payload.new, username: m.username } : m)),
          )
        if (payload.eventType === "DELETE") setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
      })
      .subscribe()

    const reactionsSubscription = supabase
      .channel("message_reactions")
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, (payload) => {
        const { message_id, reaction_type, user_id } = payload.new || payload.old || {}

        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== message_id) return m

            const reactions = { ...m.reactions }

            if (payload.eventType === "INSERT") {
              reactions[reaction_type] = (reactions[reaction_type] || 0) + 1
              if (user_id === currentUser?.id) m.userReaction = reaction_type
            } else if (payload.eventType === "DELETE") {
              reactions[reaction_type] = Math.max((reactions[reaction_type] || 1) - 1, 0)
              if (user_id === currentUser?.id) m.userReaction = undefined
            }

            return { ...m, reactions }
          }),
        )
      })
      .subscribe()

    const usersSubscription = supabase
      .channel("users")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, (payload) => {
        if (payload.eventType === "INSERT") setUsers((prev) => [...prev, payload.new])
        if (payload.eventType === "UPDATE")
          setUsers((prev) => prev.map((u) => (u.id === payload.new.id ? payload.new : u)))
        if (payload.eventType === "DELETE") setUsers((prev) => prev.filter((u) => u.id !== payload.old.id))
      })
      .subscribe()

    // Cleanup on unmount
    return () => {
      messagesSubscription.unsubscribe()
      usersSubscription.unsubscribe()
    }
  }, [currentUser]) // Add currentUser if subscriptions depend on it

  useEffect(() => {
    if (!supabase) return

    const restoreSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (session?.user) {
        // Fetch the user profile from your users table
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single()

        if (profile) {
          setCurrentUser(profile)
          // Optionally update online status
          await supabase
            .from("users")
            .update({ is_online: true, last_seen: new Date().toISOString() })
            .eq("id", session.user.id)
        }
      }
    }

    restoreSession()
  }, [])

  useEffect(() => {
    if (!currentUser || !supabase) return

    // Update last_seen timestamp every 30 seconds
    const heartbeat = setInterval(async () => {
      await supabase
        .from("users")
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq("id", currentUser.id)
    }, 30000)

    // Set user offline when leaving
    const handleBeforeUnload = async () => {
      await supabase
        .from("users")
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq("id", currentUser.id)
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      clearInterval(heartbeat)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [currentUser])

  // Scroll to bottom when messages first load or when user signs in
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const prevCurrentUserRef = useRef<UserProfile | null>(null)

  // Reset scroll state when user signs in
  useEffect(() => {
    // Check if user just signed in (changed from null to a user)
    if (currentUser && !prevCurrentUserRef.current) {
      setHasScrolledToBottom(false)
    }
    prevCurrentUserRef.current = currentUser
  }, [currentUser])

  useEffect(() => {
    if (messages.length > 0 && currentUser && !hasScrolledToBottom) {
      // Use requestAnimationFrame and multiple timeouts to ensure DOM is fully updated
      requestAnimationFrame(() => {
        setTimeout(() => {
          scrollToBottom(false)
          // Double check after a short delay
          setTimeout(() => {
            const container = messagesContainerRef.current
            if (container) {
              const isAtBottom =
                container.scrollHeight - container.scrollTop - container.clientHeight < 10
              if (!isAtBottom) {
                scrollToBottom(false)
              }
            }
            setHasScrolledToBottom(true)
          }, 200)
        }, 100)
      })
    }
  }, [messages.length, currentUser, hasScrolledToBottom])

  // Auto-scroll to bottom when new messages arrive (if user is near bottom)
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container || messages.length === 0) return

    // Check if user is near bottom (within 150px)
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150

    if (isNearBottom) {
      setTimeout(() => {
        scrollToBottom(true)
      }, 50)
    }
  }, [messages])

  // Track scroll position to show/hide scroll to bottom button
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 50
      setIsAtBottom(isNearBottom)
    }

    container.addEventListener("scroll", handleScroll)
    handleScroll() // Check initial state

    return () => {
      container.removeEventListener("scroll", handleScroll)
    }
  }, [messages])

  const loadMessages = async () => {
    if (!supabase) return

    try {
      console.log("[v0] Loading messages...")
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          users!inner(username),
          message_reactions(reaction_type, user_id)
        `)
        .order("created_at", { ascending: true })
        .limit(100)

      if (error) {
        console.error("[v0] Error loading messages:", error)
        if (error.message.includes("relation") || error.message.includes("does not exist")) {
          setConnectionError("Database tables not set up. Please run the SQL scripts.")
        }
        return
      }

      console.log("[v0] Loaded messages:", data?.length || 0)

      const processedMessages = await Promise.all(
        (data || []).map(async (msg: any) => {
          let replyContent = ""
          let replyUsername = ""

          if (msg.reply_to) {
            const { data: repliedMsg } = await supabase
              .from("messages")
              .select(`content, users!inner(username)`)
              .eq("id", msg.reply_to)
              .single()

            if (repliedMsg) {
              replyContent = repliedMsg.content
              replyUsername = repliedMsg.users.username
            }
          }

          return {
            id: msg.id,
            user_id: msg.user_id,
            username: msg.users.username,
            content: msg.content,
            reply_to: msg.reply_to,
            reply_to_content: replyContent,
            reply_to_username: replyUsername,
            created_at: msg.created_at,
            reactions: msg.message_reactions.reduce((acc: any, reaction: any) => {
              acc[reaction.reaction_type] = (acc[reaction.reaction_type] || 0) + 1
              return acc
            }, {}),
            userReaction: msg.message_reactions.find((r: any) => r.user_id === currentUser?.id)?.reaction_type,
          }
        }),
      )

      setMessages(processedMessages)
      setConnectionError(null)
    } catch (error) {
      console.error("[v0] Error loading messages:", error)
      setConnectionError("Unable to load messages. Please check your database connection.")
    }
  }

  const loadUsers = async () => {
    if (!supabase) return

    try {
      const { data, error } = await supabase.from("users").select("*").order("is_online", { ascending: false })

      if (!error && data) {
        setUsers(data)
      }
    } catch (error) {
      console.error("Error loading users:", error)
    }
  }

  const handleAuth = async () => {
    setAuthError(null)
    setAuthSuccess(null)

    try {
      if (authMode === "signup") {
        if (!authData.email.endsWith("@streetrat.ac.th")) {
          setAuthError("Please use your @streetrat.ac.th email address")
          return
        }

        const trimmedUsername = authData.username.trim()
        if (!trimmedUsername) {
          setAuthError("Please enter a username")
          return
        }

        if (authData.password.length < 6) {
          setAuthError("Password must be at least 6 characters long")
          return
        }

        if (!authData.turnstileToken) {
          setAuthError("Please complete the human check")
          return
        }

        console.log("[v0] Attempting signup with username:", trimmedUsername)
        const { data, error } = await supabase.auth.signUp({
          email: authData.email,
          password: authData.password,
          options: {
            captchaToken: authData.turnstileToken,
            data: {
              username: trimmedUsername,
            },
            emailRedirectTo: undefined,
          },
        })

        if (error) throw error

        console.log("[v0] Signup successful, creating profile with username:", trimmedUsername)
        console.log("[v0] User ID:", data.user?.id)
        console.log("[v0] Email:", authData.email)

        if (data.user) {
          const { data: profileData, error: profileError } = await supabase
            .from("users")
            .insert({
              id: data.user.id,
              email: authData.email,
              username: trimmedUsername,
              is_online: true,
            })
            .select()
            .single()

          if (profileError) {
            console.error("[v0] Error creating profile:", profileError)
            console.error("[v0] Profile error details:", JSON.stringify(profileError, null, 2))

            // Check if it's a duplicate username error
            if (
              profileError.code === "23505" ||
              profileError.message?.includes("unique") ||
              profileError.message?.includes("duplicate")
            ) {
              setAuthError("Username already exists. Please choose a different username.")
            } else if (
              profileError.code === "42501" ||
              profileError.message?.includes("permission") ||
              profileError.message?.includes("policy")
            ) {
              // RLS policy error - user might need to confirm email first
              setAuthError(null)
              setAuthSuccess("Account created! Please check your email and confirm your account, then sign in.")
            } else {
              setAuthError(
                `Profile creation failed: ${profileError.message || "Unknown error"}. Please try signing in after confirming your email.`,
              )
            }
            return
          }

          console.log("[v0] Profile created successfully:", profileData)

          // Verify the username was saved
          if (profileData && profileData.username) {
            setCurrentUser({
              id: data.user.id,
              email: authData.email,
              username: profileData.username,
              is_online: true,
              last_seen: new Date().toISOString(),
            })
            console.log("[v0] Current user set with username:", profileData.username)
          } else {
            // Fallback to trimmed username if profileData doesn't have it
            setCurrentUser({
              id: data.user.id,
              email: authData.email,
              username: trimmedUsername,
              is_online: true,
              last_seen: new Date().toISOString(),
            })
            console.log("[v0] Current user set with fallback username:", trimmedUsername)
          }

          setShowAuth(false)
          setAuthData({ email: "", password: "", username: "", turnstileToken: "" })
          setAuthSuccess(t?.community?.accountCreated || "Account created successfully!")
        }
      } else {
        if (!authData.turnstileToken) {
          setAuthError("Please complete the human check")
          return
        }

        console.log("[v0] Attempting sign in...")
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authData.email,
          password: authData.password,
          options: {
            captchaToken: authData.turnstileToken,
          },
        })

        if (error) throw error

        console.log("[v0] Sign in successful, fetching profile...")
        if (data.user) {
          // Check if username exists in auth metadata (from sign-up)
          const usernameFromMetadata = data.user.user_metadata?.username
          console.log("[v0] Username from auth metadata:", usernameFromMetadata)

          const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("*")
            .eq("id", data.user.id)
            .single()

          if (profileError || !profile) {
            // Profile doesn't exist - create it with username from metadata if available
            const username = usernameFromMetadata || authData.email.split("@")[0]
            console.log(
              "[v0] Creating profile with username:",
              username,
              "(from metadata:",
              !!usernameFromMetadata,
              ")",
            )

            const { data: newProfile, error: insertError } = await supabase
              .from("users")
              .insert({
                id: data.user.id,
                email: authData.email,
                username: username,
                is_online: true,
              })
              .select()
              .single()

            if (insertError) {
              console.error("[v0] Error creating profile during sign-in:", insertError)
              setAuthError("Failed to create profile. Please contact support.")
              return
            }

            setCurrentUser({
              id: data.user.id,
              email: authData.email,
              username: newProfile?.username || username,
              is_online: true,
              last_seen: new Date().toISOString(),
            })
          } else {
            // Profile exists - update it if username in metadata is different and profile has email-based username
            const currentUsername = profile.username || ""
            const isEmailBasedUsername =
              currentUsername === authData.email.split("@")[0] || currentUsername === authData.email

            if (usernameFromMetadata && isEmailBasedUsername && currentUsername !== usernameFromMetadata) {
              console.log("[v0] Updating username from email-based to metadata username:", usernameFromMetadata)
              const { data: updatedProfile, error: updateError } = await supabase
                .from("users")
                .update({
                  username: usernameFromMetadata,
                  is_online: true,
                  last_seen: new Date().toISOString(),
                })
                .eq("id", data.user.id)
                .select()
                .single()

              if (!updateError && updatedProfile) {
                setCurrentUser(updatedProfile)
              } else {
                // If update fails, use existing profile
                await supabase
                  .from("users")
                  .update({ is_online: true, last_seen: new Date().toISOString() })
                  .eq("id", data.user.id)
                setCurrentUser(profile)
              }
            } else {
              // Normal case - just update online status
              await supabase
                .from("users")
                .update({ is_online: true, last_seen: new Date().toISOString() })
                .eq("id", data.user.id)
              setCurrentUser(profile)
            }
          }

          setShowAuth(false)
          setAuthData({ email: "", password: "", username: "", turnstileToken: "" })
        }
      }
    } catch (error) {
      console.error("[v0] Auth error:", error)
      setAuthError((error as any)?.message || "Authentication failed")
    }
  }

  const handleSignOut = async () => {
    if (!supabase || !currentUser) return

    await supabase
      .from("users")
      .update({ is_online: false, last_seen: new Date().toISOString() })
      .eq("id", currentUser.id)

    await supabase.auth.signOut()
    setCurrentUser(null)
  }

  const handleSendMessage = async () => {
    if (!supabase || !currentUser || !newMessage.trim()) return

    try {
      await supabase.from("messages").insert({
        user_id: currentUser.id,
        content: newMessage.trim(),
        reply_to: replyTo,
      })

      setNewMessage("")
      setReplyTo(null)
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const handleReaction = async (messageId: string, reactionType: string) => {
    if (!supabase || !currentUser) return

    try {
      const { data: existingReaction } = await supabase
        .from("message_reactions")
        .select("*")
        .eq("message_id", messageId)
        .eq("user_id", currentUser.id)
        .single()

      let newUserReaction: string | undefined = reactionType

      if (existingReaction?.reaction_type === reactionType) {
        // Remove reaction
        await supabase.from("message_reactions").delete().eq("id", existingReaction.id)
        newUserReaction = undefined
      } else {
        // Replace/add reaction
        if (existingReaction) {
          await supabase.from("message_reactions").delete().eq("id", existingReaction.id)
        }
        await supabase.from("message_reactions").insert({
          message_id: messageId,
          user_id: currentUser.id,
          reaction_type: reactionType,
        })
      }

      // Update state locally
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m

          const reactions = { ...m.reactions }

          // Adjust counts
          if (existingReaction) {
            reactions[existingReaction.reaction_type] = Math.max(
              (reactions[existingReaction.reaction_type] || 1) - 1,
              0,
            )
          }
          if (newUserReaction) {
            reactions[newUserReaction] = (reactions[newUserReaction] || 0) + 1
          }

          return { ...m, reactions, userReaction: newUserReaction }
        }),
      )
    } catch (error) {
      console.error("[v0] Error handling reaction:", error)
    }
  }

  const openProfile = (user: UserProfile) => {
    setSelectedProfile(user)
    setShowProfileSheet(true)
  }

  const onlineUsers = users.filter((u) => {
    const lastSeen = new Date(u.last_seen).getTime()
    const now = new Date().getTime()
    const twoMinutesMs = 2 * 60 * 1000
    return u.is_online && now - lastSeen < twoMinutesMs
  })
  const offlineUsers = users.filter(
    (u) => !u.is_online || new Date().getTime() - new Date(u.last_seen).getTime() >= 2 * 60 * 1000,
  )

  if (!currentUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {t?.community?.chat || "Community Chat"}
          </CardTitle>
          <CardDescription>
            {t?.community?.emailDomain || "Only @streetrat.ac.th email addresses are allowed"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{connectionError}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => {
                setAuthMode("signin")
                setShowAuth(true)
                setAuthError(null)
                setAuthSuccess(null)
              }}
            >
              {t?.community?.signIn || "Sign In"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setAuthMode("signup")
                setShowAuth(true)
                setAuthError(null)
                setAuthSuccess(null)
              }}
            >
              {t?.community?.signUp || "Sign Up"}
            </Button>
          </div>
        </CardContent>

        <Dialog open={showAuth} onOpenChange={setShowAuth}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {authMode === "signin" ? t?.community?.signIn || "Sign In" : t?.community?.signUp || "Sign Up"}
              </DialogTitle>
              <DialogDescription>
                {t?.community?.emailDomain || "Only @streetrat.ac.th email addresses are allowed"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {authError && (
                <Alert variant="destructive">
                  <Info className="h-4 w-4" />
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              )}

              {authSuccess && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>{authSuccess}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="email">{t?.community?.email || "Email"}</Label>
                <Input
                  id="email"
                  type="email"
                  value={authData.email}
                  onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                  placeholder="your.name@streetrat.ac.th"
                />
              </div>

              {authMode === "signup" && (
                <div>
                  <Label htmlFor="username">{t?.community?.username || "Username"}</Label>
                  <Input
                    id="username"
                    value={authData.username}
                    onChange={(e) => setAuthData({ ...authData, username: e.target.value })}
                    placeholder="Your display name"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="password">{t?.community?.password || "Password"}</Label>
                <Input
                  id="password"
                  type="password"
                  value={authData.password}
                  onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                  placeholder="At least 6 characters"
                />
              </div>


              {/* Turnstile for both Sign In and Sign Up */}
              <div>
                <Label>Let us check if you are really a human</Label>
                <CloudflareTurnstile
                  onVerify={(token) => {
                    setAuthData((prev) => ({ ...prev, turnstileToken: token }))
                  }}
                  onExpire={() => {
                    setAuthData((prev) => ({ ...prev, turnstileToken: "" }))
                    setAuthError("human check expired. Please verify again.")
                  }}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleAuth}
                  className="flex-1"
                  disabled={
                    !authData.email ||
                    !authData.password ||
                    (authMode === "signup" && (!authData.username || !authData.turnstileToken))
                  }
                >
                  {authMode === "signin"
                    ? t?.community?.signIn || "Sign In"
                    : t?.community?.createAccount || "Create Account"}
                </Button>
                <Button variant="outline" onClick={() => setShowAuth(false)}>
                  {t?.common?.cancel || "Cancel"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {connectionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{connectionError}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-4">
        <Badge variant="default" className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Online: {onlineUsers.length}</span>
        </Badge>
        <Badge variant="secondary" className="flex items-center gap-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <span>Offline: {offlineUsers.length}</span>
        </Badge>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          {t?.community?.signOut || "Sign Out"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {t?.community?.chat || "Community Chat"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div
              ref={messagesContainerRef}
              className="h-[400px] overflow-y-auto space-y-4 mb-4 p-4 border rounded-tr-2xl rounded-bl-2xl"
            >
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => {
                  const messageUser = users.find((u) => u.id === message.user_id)
                  return (
                    <div key={message.id} className="space-y-2">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => messageUser && openProfile(messageUser)}
                          className="w-8 h-8 bg-blue-500 rounded-tr-lg rounded-bl-lg flex items-center justify-center text-white text-sm font-medium hover:opacity-80 transition-opacity"
                        >
                          {message.username.charAt(0).toUpperCase()}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <button
                              onClick={() => messageUser && openProfile(messageUser)}
                              className="font-medium hover:underline"
                            >
                              {message.username}
                            </button>
                            <span className="text-xs text-muted-foreground">
                              {new Date(message.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="bg-gray-100 rounded-tr-2xl rounded-bl-2xl rounded-br-2xl p-3 max-w-full overflow-hidden">
                            {message.reply_to && (
                              <div className="text-xs text-muted-foreground mb-2 pl-2 border-l-2 border-gray-300 break-words">
                                Replying to <span className="font-medium">{message.reply_to_username}</span>:{" "}
                                <span className="italic">"{message.reply_to_content}"</span>
                              </div>
                            )}
                            <p className="whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.content}</p>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReaction(message.id, "like")}
                              className={`h-8 px-3 ${message.userReaction === "like" ? "bg-blue-100 text-blue-700" : "hover:bg-blue-50"
                                }`}
                            >
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              <span className="font-medium">{message.reactions.like || 0}</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReaction(message.id, "dislike")}
                              className={`h-8 px-3 ${message.userReaction === "dislike" ? "bg-red-100 text-red-700" : "hover:bg-red-50"
                                }`}
                            >
                              <ThumbsDown className="h-4 w-4 mr-1" />
                              <span className="font-medium">{message.reactions.dislike || 0}</span>
                            </Button>

                            <Button variant="ghost" size="sm" onClick={() => setReplyTo(message.id)} className="h-8 px-3">
                              <Reply className="h-4 w-4 mr-1" />
                              {t?.community?.reply || "Reply"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            {!isAtBottom && (
              <Button
                onClick={() => scrollToBottom(true)}
                className="absolute bottom-8 right-6 h-10 w-10 p-0 rounded-tr-lg rounded-bl-lg transition-all duration-300 hover:w-auto hover:px-4 group overflow-hidden shadow-lg z-10 flex items-center justify-center"
                variant="default"
              >
                <ChevronDown className="h-5 w-5 shrink-0 transition-all duration-300 group-hover:mr-2" />
                <span className="whitespace-nowrap opacity-0 w-0 overflow-hidden group-hover:opacity-100 group-hover:w-auto group-hover:ml-1 transition-all duration-300">
                  {t?.community?.scrollToBottom || "Scroll to bottom"}
                </span>
              </Button>
            )}
          </div>

          {replyTo && (
            <div className="flex items-center justify-between bg-blue-50 p-2 rounded-tr-lg rounded-bl-2xl mb-2">
              <span className="text-sm">Replying to: {messages.find((m) => m.id === replyTo)?.username}</span>
              <Button variant="ghost" size="sm" onClick={() => setReplyTo(null)}>
                ×
              </Button>
            </div>
          )}

          <div className="flex gap-2 items-end w-full">
            <textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
              }}
              placeholder={t?.community?.sendMessage || "Type your message..."}
              className="flex-1 resize-none min-w-0 rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              rows={2}
              wrap="soft"
              style={{
                flex: "1 1 0%",
                minWidth: 0,
                overflowX: "hidden",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
            />
            <Button onClick={handleSendMessage} disabled={!newMessage.trim()} className="flex-shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Sheet open={showProfileSheet} onOpenChange={setShowProfileSheet}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedProfile?.username || "User Profile"}
            </SheetTitle>
          </SheetHeader>
          {selectedProfile && (
            <div className="space-y-4 mt-6">
              <div className="w-16 h-16 bg-blue-500 rounded-tr-lg rounded-bl-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto">
                {selectedProfile.username.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Username</Label>
                  <p className="font-medium">{selectedProfile.username}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-medium text-sm">{selectedProfile.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedProfile.is_online ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-tr-lg rounded-bl-2xl"></div>
                        <p className="text-sm">Online</p>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-gray-400 rounded-tr-lg rounded-bl-2xl"></div>
                        <p className="text-sm">Last seen: {new Date(selectedProfile.last_seen).toLocaleString()}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
