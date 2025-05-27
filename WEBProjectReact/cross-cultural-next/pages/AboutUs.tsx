"use client";

import Image from "next/image";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../app/components/ui/card";
import Navbar from "../app/components/Navbar";

const teamMembers = [
  {
    name: "Shadi Alkeesh",
    image: "/images/shadi.png",
    location: "Buqata, Golan Heights",
    phone: "+972-54-481-1751",
    email: "shadikeesha@gmail.com",
    about: "A passionate web developer and physicist, focused on building scalable and user-friendly applications."
  },
  {
    name: "Lama",
    image: "/images/lama.png",
    location: "Nazareth, Israel",
    phone: "+972-52-234-5678",
    email: "lama@example.com",
    about: "Frontend wizard and design enthusiast with a keen eye for clean UI/UX."
  },
  {
    name: "Ayman",
    image: "/images/ayman.jpg",
    location: "Haifa, Israel",
    phone: "+972-53-345-6789",
    email: "ayman@example.com",
    about: "Backend developer who loves working with databases and building robust APIs."
  },
  {
    name: "Michel",
    image: "/images/michel.png",
    location: "Jerusalem, Israel",
    phone: "+972-54-456-7890",
    email: "michel@example.com",
    about: "Software engineer with a passion for performance and security."
  },
  {
    name: "Sherbil",
    image: "/images/sherbil.png",
    location: "Tel Aviv, Israel",
    phone: "+972-55-567-8901",
    email: "sherbil@example.com",
    about: "DevOps and deployment expert ensuring our app runs smooth in production."
  },
  {
    name: "Loai",
    image: "/images/loai.png",
    location: "Akka, Israel",
    phone: "+972-56-678-9012",
    email: "loai@example.com",
    about: "Project coordinator and testing specialist with strong communication skills."
  }
];

export default function AboutUs() {
  return (
    <div><Navbar />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
      {teamMembers.map((member, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle>{member.name}</CardTitle>
            <CardDescription>{member.location}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <Image
                src={member.image}
                alt={member.name}
                width={400}
                height={400}
                className="w-[400] h-[400px] object-cover rounded-xl mb-4"
              />
              <p className="text-sm text-center">{member.about}</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start text-sm space-y-1">
            <p><strong>Email:</strong> {member.email}</p>
            <p><strong>Phone:</strong> {member.phone}</p>
          </CardFooter>
        </Card>
      ))}
    </div>
    </div>
  );
}
