import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "../app/components/ui/button";
import { Input } from "../app/components/ui/input";
import { Label } from "../app/components/ui/label";
import { useToast } from "../app/components/ui/use-toast";
import Logo from "../app/components/Logo";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAccountRecovery, setShowAccountRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "INCOMPLETE_ACCOUNT_SETUP") {
          setError(data.message);
          setShowAccountRecovery(true);
          return;
        } else if (data.code === "INVALID_PASSWORD_FORMAT") {
          setError(data.message + " Your account needs to be reactivated.");
          setShowAccountRecovery(true);
          return;
        } else {
          throw new Error(data.message || "Failed to sign in");
        }
      }

      // Success - store user data and redirect
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);
      sessionStorage.setItem("isLoggedIn", "true");

      toast({
        title: "Success!",
        description: "You have been signed in.",
      });

      router.push("/Profile");
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Sign in failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setIsResetting(true);
    setError("");

    try {
      const response = await fetch("/api/reset-incomplete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email, 
          newPassword 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset account");
      }

      toast({
        title: "Account Reactivated!",
        description: "Your account has been reactivated. Please sign in with your new password.",
      });

      // Reset form and go back to normal sign in
      setShowAccountRecovery(false);
      setNewPassword("");
      setConfirmPassword("");
      setPassword("");
      setError("");

    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Account recovery failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-muted/30">
      <div className="w-full max-w-md space-y-8 bg-background p-8 rounded-lg shadow-lg animate-fade-in">
        <div className="text-center">
          <Logo className="mx-auto h-12 w-auto" />
          <h1 className="mt-6 text-2xl font-bold">
            {showAccountRecovery ? "Reactivate Account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {showAccountRecovery 
              ? "Set a new password to reactivate your account"
              : "Sign in to your account to continue your academic journey"
            }
          </p>
        </div>

        {showAccountRecovery ? (
          <form className="mt-8 space-y-6" onSubmit={handleAccountRecovery}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm">
              <strong>Account Recovery:</strong> Your account needs to be reactivated. 
              Please set a new password below.
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled={true}
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Button type="submit" className="w-full" disabled={isResetting}>
                {isResetting ? "Reactivating..." : "Reactivate Account"}
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={() => {
                  setShowAccountRecovery(false);
                  setError("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                disabled={isResetting}
              >
                Back to Sign In
              </Button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account?</span>{" "}
              <Link href="/Register" className="font-medium text-brand-blue hover:text-brand-purple">
                Create one now
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SignIn;