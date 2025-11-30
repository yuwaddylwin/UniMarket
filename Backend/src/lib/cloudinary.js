import {v2 as cloudinary } from 'cloudinary';

import {config} from "dotenv";

config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Testing Cloudinary
console.log("Cloudinary config:", {
cloud: process.env.CLOUDINARY_CLOUD_NAME,
key: process.env.CLOUDINARY_API_KEY,
secret: process.env.CLOUDINARY_API_SECRET ? "loaded" : "NOT LOADED"
});

export default cloudinary;