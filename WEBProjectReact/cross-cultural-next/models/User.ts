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
      default: "",
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

// Hash password before saving
userSchema.pre("save", async function (next) {
  // Only hash the password if it's modified or new
  if (!this.isModified("password")) return next();
  
  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    // Hash password with salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Prevent mongoose error by checking if the model exists before creating it
const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;