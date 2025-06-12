// models/User.ts - Enhanced version with password protection
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
      // Don't use select: false - we need explicit control
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

// 🔧 Enhanced password hashing with better protection
userSchema.pre("save", async function (next) {
  console.log(`🔐 Pre-save hook triggered for user: ${this.email}`);
  console.log(`🔐 Modified paths: ${this.modifiedPaths().join(', ')}`);
  console.log(`🔐 Password modified: ${this.isModified("password")}`);
  console.log(`🔐 Password exists: ${!!this.password}`);
  
  // Only hash the password if it's modified or new
  if (!this.isModified("password")) {
    console.log("🔐 Password not modified, skipping hash");
    return next();
  }
  
  // Check if password field exists
  if (!this.password) {
    console.log("❌ Password field is missing during save!");
    return next(new Error("Password field is required"));
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

// 🔧 CRITICAL: Pre-update hook to prevent password removal
userSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  const update = this.getUpdate() as any;
  
  console.log(`🔒 Pre-update hook triggered`);
  console.log(`🔒 Update operation:`, JSON.stringify(update, null, 2));
  
  // Prevent password from being accidentally removed or overwritten
  if (update && typeof update === 'object') {
    // Check $set operations
    if (update.$set) {
      if (update.$set.hasOwnProperty('password')) {
        console.log("⚠️ WARNING: Update operation trying to modify password field!");
        if (!update.$set.password || update.$set.password === '') {
          console.log("🚨 BLOCKING: Attempt to remove password field via $set");
          delete update.$set.password;
        }
      }
    }
    
    // Check direct field updates
    if (update.hasOwnProperty('password')) {
      console.log("⚠️ WARNING: Direct password field modification detected!");
      if (!update.password || update.password === '') {
        console.log("🚨 BLOCKING: Attempt to remove password field directly");
        delete update.password;
      }
    }
    
    // Prevent replacement operations that might remove password
    if (!update.$set && !update.$unset && !update.$inc && Object.keys(update).length > 0) {
      console.log("⚠️ WARNING: Potential document replacement detected!");
      // This is a replacement operation - very dangerous for password field
      if (!update.password) {
        console.log("🚨 BLOCKING: Document replacement without password field");
        return next(new Error("Document replacement operations must preserve password field"));
      }
    }
  }
  
  next();
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
  
  const user = await this.findOne({ 
    email: email.toLowerCase().trim() 
  }).select('+password');
  
  if (user) {
    console.log("✅ User found for authentication");
    console.log("🔐 Password field exists:", !!user.password);
    console.log("🔐 Password length:", user.password ? user.password.length : 0);
  } else {
    console.log("❌ User not found for authentication");
  }
  
  return user;
};

// 🔧 Add method to safely update profile without touching password
userSchema.statics.updateProfileSafely = async function(userId: string, updates: any) {
  console.log("🔒 Safe profile update for user:", userId);
  console.log("🔒 Updates:", updates);
  
  // Remove any password-related fields
  const { password, _id, __v, createdAt, updatedAt, ...safeUpdates } = updates;
  
  console.log("🔒 Sanitized updates:", safeUpdates);
  
  return await this.findByIdAndUpdate(
    userId,
    { $set: safeUpdates },
    { 
      new: true,
      runValidators: true,
      context: 'query'
    }
  ).select('-password');
};

// Prevent mongoose error by checking if the model exists before creating it
const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;