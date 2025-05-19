import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "../app/components/ui/button";
import { Input } from "../app/components/ui/input";
import { Label } from "../app/components/ui/label";
import { useToast } from "../app/components/ui/use-toast";
import Logo from "../app/components/Logo";
import CountrySelect from "../app/components/ui/CountrySelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../app/components/ui/select";
import _ from "lodash";

const Register = () => {
  // Form data state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "",
    educationalLevel: "",
  });
  
  // Temporary input state to store values while typing
  const [inputValues, setInputValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  // Create a debounced function for updating form data
  // This will only trigger after the user stops typing for 500ms
  const debouncedSetFormData = _.debounce((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, 500);

  // Handle input changes - updates the temporary input state immediately
  // but only updates the form data after debouncing
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    
    // Update the temporary input state immediately for visual feedback
    setInputValues(prev => ({ ...prev, [id]: value }));
    
    // Debounce the actual form data update
    debouncedSetFormData(id, value);
  };

  // Handle select changes (these typically don't need debouncing as they're not typed)
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Clean up the debounce function on unmount
  useEffect(() => {
    return () => {
      debouncedSetFormData.cancel();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call the Next.js API route directly
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          country: formData.country,
          educationalLevel: formData.educationalLevel,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        // Handle error responses
        if (data.code === "USER_EXISTS" || data.code === "DUPLICATE_KEY") {
          throw new Error("A user with this email already exists.");
        } else {
          throw new Error(data.message || "Failed to register. Please try again.");
        }
      }

      // Success case
      toast({ 
        title: "Account created!", 
        description: "You have successfully registered." 
      });
      
      // Redirect to sign in page
      router.push("/SignIn");
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Registration failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Use the temporary input values for display but the actual form data for submission
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-muted/30">
      <div className="w-full max-w-lg bg-white p-8 rounded-lg shadow-lg animate-fade-in">
        <div className="text-center">
          <Logo className="mx-auto h-12 w-auto" />
          <h1 className="mt-6 text-2xl font-bold">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Join the community of global students navigating academic transitions
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input 
                id="firstName" 
                value={inputValues.firstName} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input 
                id="lastName" 
                value={inputValues.lastName} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="email">Email address</Label>
              <Input 
                id="email" 
                type="email" 
                value={inputValues.email} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={inputValues.password} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                value={inputValues.confirmPassword} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div>
              <Label htmlFor="country">Current Country</Label>
              <CountrySelect
                id="country"
                value={formData.country}
                onChange={(value) => handleSelectChange("country", value)}
              />
            </div>
            <div>
              <Label htmlFor="educationalLevel">Educational Level</Label>
              <Select onValueChange={(value) => handleSelectChange("educationalLevel", value)}>
                <SelectTrigger id="educationalLevel">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent className="w-full bg-gray-50">
                  <SelectItem value="High School">High School</SelectItem>
                  <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                  <SelectItem value="Graduate">Graduate</SelectItem>
                  <SelectItem value="PhD">PhD</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create account"}
          </Button>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Already have an account?</span>{" "}
            <Link href="/SignIn" className="font-medium text-brand-blue hover:text-brand-purple">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;