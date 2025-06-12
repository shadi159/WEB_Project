// models/User.ts - Fixed version with explicit password selection control
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Define the user schema
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      // 🔧 IMPORTANT: Remove 'select: false' if you had it, and explicitly control selection in queries
    },
    country: {
      type: String,
      required: false,
      trim: true,
    },
    destination: {  
      type: String,
      trim: true,
      default: ""
    },
    phone: {
      type: String,
      required: false,
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number"],
    },
    educationalLevel: {
      type: String,
      required: false,
      enum: [
        "High School", 
        "Undergraduate", 
        "Graduate", 
        "PhD", 
        "Professional",
        "Vocational",
        "Postdoctoral"
      ]
    },
    fieldOfStudy: {
      type: String,
      default: "Design",
      enum: [
        "Computer Science", 
        "Business", 
        "Engineering", 
        "Medicine", 
        "Arts",
        "Social Sciences",
        "Natural Sciences",
        "Education",
        "Law",
        "Architecture",
        "Psychology",
        "Design",
      ]
    },
    bio: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["user", "mentor", "admin"],
      default: "user",
    },
    preferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      appNotifications: {
        type: Boolean,
        default: true,
      },
      resourceRecommendations: {
        type: Boolean,
        default: true,
      },
      peerConnections: {
        type: Boolean,
        default: true,
      },
    },
  },
  { timestamps: true }
);

// 🔧 Enhanced password hashing with better error handling
userSchema.pre("save", async function (next) {
  // Only hash the password if it's modified or new
  if (!this.isModified("password")) {
    console.log("🔐 Password not modified, skipping hash");
    return next();
  }
  
  try {
    console.log("🔐 Hashing password for user:", this.email);
    console.log("🔐 Original password length:", this.password.length);
    
    // Check if password is already hashed (starts with $2a$ or $2b$)
    if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
      console.log("🔐 Password already hashed, skipping");
      return next();
    }
    
    // Generate salt with higher rounds for better security
    const salt = await bcrypt.genSalt(12);
    
    // Hash password with salt
    const hashedPassword = await bcrypt.hash(this.password, salt);
    this.password = hashedPassword;
    
    console.log("✅ Password hashed successfully");
    console.log("🔐 Hashed password length:", this.password.length);
    
    next();
  } catch (error: any) {
    console.error("❌ Password hashing error:", error);
    next(error);
  }
});

// 🔧 Enhanced password comparison method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    console.log("🔐 Comparing passwords for user:", this.email);
    console.log("🔐 Candidate password length:", candidatePassword.length);
    console.log("🔐 Stored password exists:", !!this.password);
    console.log("🔐 Stored password length:", this.password ? this.password.length : 0);
    
    if (!this.password) {
      console.log("❌ No stored password found");
      return false;
    }
    
    const result = await bcrypt.compare(candidatePassword, this.password);
    console.log("🔐 Password comparison result:", result ? "✅ Match" : "❌ No match");
    
    return result;
  } catch (error) {
    console.error("❌ Password comparison error:", error);
    return false;
  }
};

// 🔧 Add a method to check if user has valid password
userSchema.methods.hasValidPassword = function(): boolean {
  return !!(this.password && this.password.length > 0);
};

// 🔧 Add static method to find user with password for authentication
userSchema.statics.findForAuthentication = async function(email: string) {
  console.log("🔍 Finding user for authentication:", email);
  
  // Explicitly include password field
  const user = await this.findOne({ 
    email: email.toLowerCase().trim() 
  }).select('+password'); // Ensure password is included even if it has select: false
  
  if (user) {
    console.log("✅ User found for authentication");
    console.log("🔐 Password field exists:", !!user.password);
    console.log("🔐 Password length:", user.password ? user.password.length : 0);
  } else {
    console.log("❌ User not found for authentication");
  }
  
  return user;
};

// Prevent mongoose error by checking if the model exists before creating it
const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;