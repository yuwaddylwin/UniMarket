import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const ProtectRoute = async (req,res,next) =>{
    try{
        const authHeader = req.headers.authorization || req.headers.Authorization;
        const token = authHeader?.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : req.cookies?.jwt;

        if (!token){
            return res.status(401).json({message: "Unauthorized - No Token Provided"});
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        if(!decoded){
            return res.status(401).json({message: "Unauthorized - Invalid Token"});
        }

        const user = await User.findById(decoded.userId).select(
            "-password -verificationToken -verificationTokenExpires"
        );

        if(!user){
            return res.status(404).json({message: "User not found"});
        }

        if (!user.verified) {
            return res.status(401).json({
                message: "Please verify your email before logging in."
            });
        }

        req.user = user
        

        next();
    }catch(error){
        console.log("Error in protectRoute middleware", error.message);
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            return res.status(401).json({message: "Unauthorized - Invalid Token"});
        }
        res.status(500).json({message: "Internal server error"});
    }
}
