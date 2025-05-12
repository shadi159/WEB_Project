"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "../app/components/ui/button";
import { Input } from "../app/components/ui/input";
import { Label } from "../app/components/ui/label";
import { useToast } from "../app/components/ui/use-toast";
import Logo from "../app/components/Logo";
import CountrySelect from "../app/components/ui/CountrySelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../app/components/ui/select";

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "",
    educationalLevel: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          country: formData.country,
          educationalLevel: formData.educationalLevel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Registration failed",
          description: data.message || "Something went wrong.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account created!",
          description: "You have successfully registered.",
        });
        router.push("/signin");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" value={formData.firstName} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" value={formData.lastName} onChange={handleChange} required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={formData.password} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required />
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
                <SelectContent className="max-h-60 overflow-auto bg-gray-200">
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
