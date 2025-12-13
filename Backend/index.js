import express, { Router } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import cors from 'cors'; 
import cookieParser from "cookie-parser";
import ItemsList from "./src/routes/Items.route.js";
import authRoutes from "./src/routes/auth.route.js";
import messageRoutes from "./src/routes/message.route.js";



//Middleware
const app = express();
app.use(cors({
  origin: "http://localhost:3000", //frontend URL
  credentials: true, // to allow cookies
}));
app.use(express.json({ limit: "20mb" }));
app.use(cookieParser());



const PORT = process.env.PORT || 8000;
const MONGOURL = process.env.MONGO_URL;


// Routes
app.use("/api/items", ItemsList);
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes); 

// Test route
app.get("/", (req, res) => {
  res.send("API is running!");
});


// Connect DB
mongoose
.connect(MONGOURL)
.then(()=>{
    console.log("Database is connected successfully.");

    // Show which DB name we connected to
    console.log("Connected DB name:", mongoose.connection.name);


    app.listen(PORT, ()=>{
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((err)=> console.log(err));





  