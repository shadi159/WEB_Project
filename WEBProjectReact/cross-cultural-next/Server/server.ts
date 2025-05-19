import express from "express";
import next from "next";
import cors from "cors"; // ✅ Import CORS
import authRoutes from "./routes/auth";
import connectToDatabase from "./middleware/dbConnect";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const port = 4000; // or use process.env.PORT

app.prepare().then(() => {
  const server = express();

  // ✅ Enable CORS for all routes (you can restrict it by origin if needed)
  server.use(cors({
    origin: "http://localhost:3000", // frontend origin (adjust if needed)
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }));

  server.use(express.json());
  server.use(connectToDatabase);
  server.use("/api", authRoutes); // API routes like /api/register


  server.listen(port, () => {
    console.log(`🚀 Server ready at http://localhost:${port}`);
  });
});
