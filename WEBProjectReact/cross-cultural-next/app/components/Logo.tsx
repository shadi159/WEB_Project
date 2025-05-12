import Link from "next/link";
import { cn } from "./../lib/utils";

type LogoProps = {
  className?: string;
};

const Logo = ({ className }: LogoProps) => {
  return (
    <Link href="/" passHref>
      <div className={cn("flex items-center gap-2", className)}>
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 bg-blue-800 rounded-full opacity-70 transform -translate-x-1 -translate-y-1"></div>
          <div className="absolute inset-0 bg-teal-500 rounded-full opacity-70 transform translate-x-1 -translate-y-1"></div>
        </div>
        <span className="text-lg font-bold text-blue-800">Edu<span className="text-lg font-bold text-teal-500">Bridge</span></span>
      </div>
    </Link>
  );
};

export default Logo;