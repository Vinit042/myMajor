import { executeQuery } from "../lib/executeQuery.js";

// Function to fetch admin profile
export const getProfile = async (req, res) => {
    try {
        const adminId = req.query.admin_id;
        if (!adminId) {
            return res.status(400).json({ message: "Admin ID is required" });
        }

        var query = `SELECT * FROM admins WHERE admin_id = '${adminId}'`;
        const adminProfile = await executeQuery(query);
        if (adminProfile.length === 0) {
            return res.status(404).json({ message: "Admin profile not found" });
        }   
        res.status(200).json(adminProfile);

    } catch (error) {
        console.error("Error while fetching admin profile:", error);
        res.status(400).send(error);
    }
}


// Function to update admin profile
export const updateProfile = async (req, res) => {
    try {
        const { first_name, middle_name, last_name, date_of_birth, email, recovery_email, phone_number, address } = req.body;
        const adminId = req.query.admin_id;

        // Validation
        if(!adminId) return res.status(400).json({ message: "Admin ID is required"});
        if (!first_name) return res.status(400).json({ message: "First name is required"});
        if (!last_name) return res.status(400).json({ message: "Last name is required"});
        if (!email) return res.status(400).json({ message: "Email is required"});
        else if (!/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ message: "Invalid email format"});
        if (!recovery_email) return res.status(400).json({ message: "Recovery email is required"});
        else if (!/\S+@\S+\.\S+/.test(recovery_email)) return res.status(400).json({ message: "Invalid recovery email format"});
        if (!phone_number) return res.status(400).json({ message: "Phone number is required"});
        if (!address) return res.status(400).json({ message: "Address is required"});
        if (!date_of_birth) return res.status(400).json({ message: "Date of birth is required"});

        // Update query
        var query = `UPDATE admins SET first_name = '${first_name}', middle_name = '${middle_name}', last_name = '${last_name}', date_of_birth = '${date_of_birth}', 
                    email = '${email}', recovery_email = '${recovery_email}', phone_number = '${phone_number}', address = '${address}', 
                    updated_at = CURRENT_TIMESTAMP WHERE admin_id = '${adminId}'`;

        const updated_admin = await executeQuery(query);

        if (updated_admin.affectedRows === 1) {
            res.status(200).json({ message: "Admin profile updated successfully" });
        }
        else {
            res.status(200).json({ message: "Failed tp update admin profile" });
        }

    } catch (error) {
        console.error("Error while updating admin profile:", error);
        res.status(400).send(error)
    }
}

// export const changePassword = async (req, res) => {
//     try {
//         const { old_password, new_password } = req.body;

//     } catch (error) {
//         console.error("Error while changing password:", error);
//         res.status(400).send(error);
//     }
// }