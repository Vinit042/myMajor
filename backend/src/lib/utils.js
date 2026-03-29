import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const generateToken = (userId, res) => {
    const token = jwt.sign({userId}, process.env.JWT_SECRET, {
        expiresIn: "9h"
    }); 

    res.cookie("jwt", token, {
        maxAge: 9*60*60*1000,
        httpOnly: true,
        sameSite: "strict",
        secure: false, // Set to true if using HTTPS
    });

    return token;
};