import express, { Router } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from 'cors'; 
import ItemsList from "./src/routes/Items.js";
import authRoutes from "./src/routes/auth.js";


//Middleware
const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());


const PORT = process.env.PORT || 8000;
const MONGOURL = process.env.MONGO_URL || "mongodb+srv://yuwaddylwin:ThhDEm2ZWMQbNngz@marketplace-cluster.7hjiut5.mongodb.net/MarketPlace";


// Routes
app.use("/api/items", ItemsList);
app.use("/api/auth", authRoutes);

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





  