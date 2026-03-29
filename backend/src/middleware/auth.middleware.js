import jwt from "jsonwebtoken";
import { executeQuery } from "../lib/executeQuery.js";

//protectRoute will check if jwt token is valid before every request
export const protectRoute = async(req, res, next) => {
    const token = req.cookies.jwt;
    if(!token){
        return res.status(401).json({message: "Unathorized - No Token Provided"});
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);   
    if(!decoded){
        return res.status(401).json({message: "Unathorized - Invalid Token"});
    }

    if(decoded.userId.includes('ADM')){
        var query = `SELECT email FROM admins WHERE admin_id = '${decoded.userId}'`;
        const user = await executeQuery(query);
        if(user.length === 0){
            return res.status(404).json({message: "Admin not found"});
        }
        return res.status(200).json({message: "Admin authenticated successfully"});
    }
    
    else if(decoded.userId.includes('EMP')){
        var query = `SELECT email FROM employees WHERE employee_id = '${decoded.userId}'`;
        const user = await executeQuery(query);
        if(user.length === 0){
            return res.status(404).json({message: "employee not found"});
        }
        return res.status(200).json({message: "Employee authenticated successfully"});
   }

    else {
        return res.status(401).json({message: "Unathorized - Invalid User Type"});
    }
}