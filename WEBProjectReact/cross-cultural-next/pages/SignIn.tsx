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
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        toast({
          title: "No account found",
          description: "Please register first.",
          variant: "destructive",
        });
        setIsLoading(false);
        router.push("/Register");
        return;
      }

      const user = JSON.parse(storedUser);

      if (user.email === email) {
        toast({
          title: "Success!",
          description: "You have been signed in.",
        });
        setIsLoading(false);
        router.push("/Profile");
      } else {
        toast({
          title: "Invalid credentials",
          description: "Email does not match our records.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-muted/30">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-lg shadow-lg animate-fade-in">
        <div className="text-center">
          <Logo className="mx-auto h-12 w-auto" />
          <h1 className="mt-6 text-2xl font-bold">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your account to continue your academic journey
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
            <Link href="/Profile" className="font-medium text-brand-blue hover:text-brand-purple">
              Create one now
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignIn;
