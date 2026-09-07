import adminRoutes from './src/routes/admin.route.js';
import reportRoutes from './src/routes/reports.route.js';
import { startChatAlertWorker } from './src/services/chatAlerts.js';
import { migrateReports, startModerationMaintenance } from './src/services/moderationMaintenance.js';
import express, { Router } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
dotenv.config();

import cors from 'cors'; 
import cookieParser from "cookie-parser";
import ItemsList from "./src/routes/Items.route.js";
import authRoutes from "./src/routes/auth.route.js";
import messageRoutes from "./src/routes/message.route.js";
import uploadRoutes from "./src/routes/upload.route.js"
import accommodationRoutes from "./src/routes/accommodations.route.js";
import { app, server } from "./src/lib/socket.js";


//Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://unimarket-web.onrender.com',
    process.env.CLIENT_URL,
  ].filter(Boolean),
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: "20mb" }));
app.use(cookieParser());



const PORT = process.env.PORT || 8000;
const MONGOURL = process.env.MONGO_URL;


// Routes
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/items", ItemsList);
app.use("/api/accommodations", accommodationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes); 
app.use("/api/upload", uploadRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));


// Test route
app.get("/", (req, res) => {
  res.send("API is running!");
});


// Return safe JSON for parser/upload/unhandled route errors as well.
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 500;
  res.status(status).json({ message: status === 413 ? 'Request is too large' : status === 400 ? 'Invalid JSON request' : 'Unable to complete this request. Please try again.' });
});

// Connect DB
mongoose
.connect(MONGOURL)
.then(async ()=>{
    await migrateReports();
    startChatAlertWorker();
    startModerationMaintenance();
    console.log("Database is connected successfully.");

    // Show which DB name we connected to
    console.log("Connected DB name:", mongoose.connection.name);


    server.listen(PORT, ()=>{
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((error)=> { console.error('Backend startup failed:', error.name); process.exitCode = 1; });
