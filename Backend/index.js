import express, { Router } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from 'cors'; // controls whether a web page can request resources (like data from an API)
import ItemsList from "./API_routes/ItemsRoutes.js";


const app = express();
dotenv.config();
app.use(cors());

const PORT = process.env.PORT || 8000;
const MONGOURL = process.env.MONGO_URL || "mongodb+srv://yuwaddylwin:ThhDEm2ZWMQbNngz@marketplace-cluster.7hjiut5.mongodb.net/MarketPlace";


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


// Routes
app.use("/api/items", ItemsList);


  