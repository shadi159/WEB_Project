import Link from "next/link";
import { cn } from "./../lib/utils";
import { useState, useEffect } from "react";

type LogoProps = {
  className?: string;
};

const Logo = ({ className }: LogoProps) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  useEffect(() => {
    // Check localStorage and sessionStorage when component mounts
    const storedUser = localStorage.getItem("user");
    const sessionFlag = sessionStorage.getItem("isLoggedIn");
    
    if (storedUser && sessionFlag === "true") {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsLoggedIn(true);
      } catch (error) {
        console.error("Error parsing user data:", error);
        setIsLoggedIn(false);
      }
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  // Determine the href based on login status
  const href = isLoggedIn ? "/Profile" : "/";

  return (
    <Link href={href} passHref>
      <div className={cn("flex items-center gap-2", className)}>
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 bg-blue-800 rounded-full opacity-70 transform -translate-x-1 -translate-y-1"></div>
          <div className="absolute inset-0 bg-teal-500 rounded-full opacity-70 transform translate-x-1 -translate-y-1"></div>
        </div>
        <span className="text-lg font-bold text-blue-800">
          Edu<span className="text-lg font-bold text-teal-500">Bridge</span>
        </span>
      </div>
    </Link>
  );
};

export default Logo;