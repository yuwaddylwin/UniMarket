import jwt from "jsonwebtoken";

export const generateToken = (userId, res ) =>{
    const token = jwt.sign({userId}, process.env.JWT_SECRET, {
        expiresIn: "7d",
    })

    //Save the JWT in the browser as a cookie (not in localStorage)
    res.cookie("jwt", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000, //7 days
        httpOnly: true,
        sameSite: "none", // change lax to none 
        secure: true //  process.env.NODE_DEV !== "development",
    })

    return token;
}