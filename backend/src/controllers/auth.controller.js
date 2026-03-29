import bcrypt from "bcryptjs";
import { executeQuery } from "../lib/executeQuery.js";
import { generateToken } from "../lib/utils.js";
import { generateOTP, hashOTP, verifyHashedOTP, sendEmail } from "../middleware/forgotPassword.middleware.js";

// Function to handle admin login
export const loginAsAdmin = async(req, res) => {
    try {
        var { email, password } = req.body;

        //SQL query to find admin by email
        var query = `select * from admins where email = '${email}'`;
        const data = await executeQuery(query);
        if(data.length===0){
            res.status(200).send({message: 'user not found'});
        }
        
        // Check if password matches
        const isPasswordCorrect = await bcrypt.compare(password, data[0].password);    
        if(!isPasswordCorrect){
            res.status(400).json({message: "Invalid Password"});
            return;
        }

        // Generate token for the admin
        generateToken(data[0].admin_id, res);

        var username = data[0].first_name + " " + data[0].last_name;

        res.status(200).json({
            message: "Login successful",
            userId: data[0].admin_id,
            username: username,
        });

    } catch (error) {
        console.error("Error during admin login:", error);
        res.status(400).send(error);
    }
};

// Function to handle employee login
export const loginAsEmployee = async(req, res) => {
    try {
        var { email, password } = req.body;

        //SQL query to find employee by email
        var query = `select id, employee_id, first_name, last_name, email, password from employees where email = '${email}'`;
        const data = await executeQuery(query);
        if(data.length===0){
            res.status(200).send({message: 'user not found'});
        }
        
        // Check if password matches
        const isPasswordCorrect = await bcrypt.compare(password, data[0].password);    
        if(!isPasswordCorrect){
            res.status(400).json({message: "Invalid Password"});
            return;
        }

        // Generate token for the employee
        generateToken(data[0].employee_id, res);

        var username = data[0].first_name + " " + data[0].last_name;

        res.status(200).json({
            message: "Login successful",
            userId: data[0].employee_id,
            username: username,
            designation: data[0].designation,
        });

    } catch (error) {
        console.error("Error during employee login:", error);
        res.status(400).send(error);
    }
};

// Function to handle logout
export const logout = (req, res) => {
    try {
        // Clear the JWT cookie
        res.cookie("jwt", "", {maxAge: 0});
        res.status(200).json({message: "Logged out successfully"});
    } catch (error) {
        console.error("Error in logout controller"+ error.message);
        res.status(500).json({message: "Internal server error"});
    }
};

// Function to handle forgot password for employee
export const forgotPasswordForEmp = async (req, res) => {
    try {
        const { email} = req.body;
        if (!email) return res.status(400).json({ message: "Email required" });
        
        // Check if email exist in the database
        var query = `SELECT * FROM employees WHERE email = ?`;
        const data = await executeQuery(query, [email]);
        if(data.length === 0) {
            return res.status(400).json({ message: "This email does not exist" });
        }
        if(data.length > 1) {
            return res.status(400).json({ message: "Multiple users with same email" });
        }

        // if email exist, generate OTP and send email
        const otp = generateOTP();
        
        // Hash the OTP and set it in an HTTP-only cookie
        await hashOTP(otp, res); 
        // Send OTP email
        await sendEmail(email, otp);
        return res.json({ message: "OTP has been sent to your email" });
    } catch (error) {
        console.error("Error in forgot password controller" + error.message);
        return res.status(400).json(error);
    }
};

// Function to verify OTP 
export const verifyOTP = async (req, res) => {
    try {
        const { otp } = req.body;
        // Get the hashed OTP from the cookie
        const hashedOtp = req.cookies.otp_hash;

        if (!hashedOtp) return res.status(400).json({ message: "OTP expired or not set" });
        // Verify entered OTP and hashed OTP are same
        const isValid = await verifyHashedOTP(otp, hashedOtp);
        if (!isValid) return res.status(400).json({ message: "Invalid OTP" });

        // OTP is valid, clear the otp_hash cookie and set otp_verified cookie
        res.clearCookie("otp_hash");
        res.cookie("otp_verified", true, {
            httpOnly: true,
            maxAge: 10 * 60 * 1000, 
            sameSite: "strict",
            secure: false,
        });

        return res.json({ message: "OTP verified" });
    } catch (error) {
        console.error("Error while verifying OTP"+ error.message);
        return res.status(400).json(error);
    }
};

// Function to reset password for employee
export const resetPasswordForEmp = async(req, res) => {
    try {
        const { email, newPassword } = req.body;
        // Check id OTP is verified
        const isVerified = req.cookies.otp_verified;
        if (!isVerified) return res.status(403).json({ message: "OTP not verified" });

        // Generate hash of new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        var query = `UPDATE employees SET password = ? where email = ?`;
        const resetPasswordResult = await executeQuery(query, [hashedPassword, email]);
        if(resetPasswordResult.affectedRows === 0){
            return res.status(400).json({ message: "Email not found" });
        }
        // If the password is successfully reset, clear the otp_verified cookie
        res.clearCookie("otp_verified");
        return res.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Error while reseting password"+ error.message);
        return res.status(400).json(error);
    }
};

// Function to handle forgot password For Admin
export const forgotPasswordForAdmin = async (req, res) => {
    try {
        const { email} = req.body;
        if (!email) return res.status(400).json({ message: "Email required" });
        
        // Check if email exist in the database
        var query = `SELECT * FROM admins WHERE email = ?`;
        const data = await executeQuery(query, [email]);
        if(data.length === 0) {
            return res.status(400).json({ message: "This email does not exist" });
        }
        if(data.length > 1) {
            return res.status(400).json({ message: "Multiple users with same email" });
        }

        // if email exist, generate OTP and send email
        const otp = generateOTP();
        
        // Hash the OTP and set it in an HTTP-only cookie
        await hashOTP(otp, res); 
        // Send OTP email
        await sendEmail(email, otp);
        return res.json({ message: "OTP has been sent to your email" });
    } catch (error) {
        console.error("Error in forgot password controller" + error.message);
        return res.status(400).json(error);
    }
};

// Function to reset password For Admin
export const resetPasswordForAdmin = async(req, res) => {
    try {
        const { email, newPassword } = req.body;
        // Check id OTP is verified
        const isVerified = req.cookies.otp_verified;
        if (!isVerified) return res.status(403).json({ message: "OTP not verified" });

        // Generate hash of new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        var query = `UPDATE admins SET password = ? where email = ?`;
        const resetPasswordResult = await executeQuery(query, [hashedPassword, email]);
        if(resetPasswordResult.affectedRows === 0){
            return res.status(400).json({ message: "Email not found" });
        }
        // If the password is successfully reset, clear the otp_verified cookie
        res.clearCookie("otp_verified");
        return res.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Error while reseting password"+ error.message);
        return res.status(400).json(error);
    }
};