'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "./ui/sheet";
import Logo from "./Logo";
import { BookOpen, LogOut, MapPin, User } from "lucide-react";
import { usePathname } from "next/navigation";


const Navbar = () => {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  useEffect(() => {
    // Get user data from localStorage when component mounts
    const storedUser = localStorage.getItem("user");
    const sessionFlag = sessionStorage.getItem("isLoggedIn");
    if (storedUser && sessionFlag === "true") {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  // Generate initials for the avatar
  const getInitials = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
    }
    return "U";  // Default if no name is available
  };

  const handleSignOut = () => {
    // 1) clear your session flag only
    sessionStorage.removeItem("isLoggedIn");

    // 2) reset React state
    setIsLoggedIn(false);
    setUser({ firstName: "", lastName: "", email: "" });

    // 3) kick them back to SignIn
    router.replace("/SignIn");
  };


  // Always visible navigation items
  const publicNavigation = [
    { name: "Resources", href: "/Resources" },
    { name: "Community", href: "/Community" },
  ];
  
  // Navigation items only visible when logged in
  const privateNavigation = [
    { name: "Dashboard", href: "/Dashboard" },
    { name: "My Journey", href: "/Journey" },
  ];

  // Combine navigation based on login status
  const navigation = isLoggedIn 
    ? [...privateNavigation, ...publicNavigation]
    : publicNavigation;

  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;
  

  return (
    <header className="bg-white border-gray-50 sticky top-0 z-10">
      <div className="shadow-md px-0 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <div>
                <Logo />
              </div>
            </div>
            
            <nav className="hidden md:ml-6 md:flex md:space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive(item.href)
                      ? "border-brand-blue text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center ml-auto"></div>
          {isLoggedIn ? (
             <div className="hidden md:flex md:items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative rounded-full p-0.5 flex ml-auto">
                    <Avatar>
                      <AvatarFallback className="bg-purple-500 text-white">{getInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-60 overflow-auto bg-gray-100">
                  <DropdownMenuLabel>{user.firstName} {user.lastName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/Profile" className="cursor-pointer flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/Journey" className="cursor-pointer flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>My Journey</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/Resources" className="cursor-pointer flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>Saved Resources</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/SignIn" className="cursor-pointer text-red-500 flex items-center gap-2" onClick={handleSignOut}>
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) :(
            <div className="hidden md:flex md:items-center">
              <Link href="/SignIn" className="text-sm font-medium text-gray-500 hover:text-gray-700">
                Sign In
              </Link>
              <Link href="/Register" className="ml-4 text-sm font-medium text-blue-500 hover:text-purple-500">
                Register
              </Link>
            </div>
          )}
          
          <div className="flex items-center ">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full">
                  <span className="sr-only">Open main menu</span>
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="px-2 pt-2 pb-3 space-y-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`block px-3 py-2 rounded-md text-base font-medium ${
                        isActive(item.href)
                          ? "bg-blue-500/10 text-brand-blue"
                          : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                  
                  {isLoggedIn ? (
                    <div className="pt-4 pb-3 border-t border-gray-200">
                      <div className="flex items-center px-3">
                        <div className="flex-shrink-0">
                          <Avatar>
                            <AvatarFallback className="bg-purple-500 text-white">{getInitials()}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="ml-3">
                          <div className="text-base font-medium text-gray-800">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm font-medium text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1">
                        <Link
                          href="/Profile"
                          className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Your Profile
                        </Link>
                        <Link
                          href="/SignIn"
                          className="block px-3 py-2 rounded-md text-base font-medium text-red-500 hover:text-red-700 hover:bg-gray-50"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            handleSignOut();
                          }}
                        >
                          Sign out
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-4 pb-3 border-t border-gray-200">
                      <div className="space-y-1">
                        <Link
                          href="/SignIn"
                          className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Sign In
                        </Link>
                        <Link
                          href="/Register"
                          className="block px-3 py-2 rounded-md text-base font-medium text-brand-blue hover:text-brand-purple hover:bg-gray-50"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Register
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;