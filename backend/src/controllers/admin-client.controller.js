import { executeQuery } from "../lib/executeQuery.js";
import validator from 'validator';
import db from "../lib/db.js";

//Function to get data of all clients
export const getAllClients = async (req, res) => {
    try {
        var query = `SELECT c.id, c.client_name, c.cp_name, c.cp_email, c.cp_phone, c.status, COUNT(p.id) as total_processes FROM clients c LEFT JOIN processes p ON c.id = p.client_id GROUP BY c.id ORDER BY c.client_name`;
        const clients = await executeQuery(query);
        if(clients.length == 0){
            return res.status(200).send({message : "No clients found"});
        }
        res.status(200).json(clients);
    } catch (error) {
        console.error("Error while fetching clients:", error);
        res.status(400).send(error);
    }
}

//Function to get data of a single client by id
export const getClientDetails = async (req, res) => {
    try {
        const clientId = req.query.clientId;
        if (!clientId) {
            return res.status(400).json({ message: "Client ID is required" });
        }
        var query = `SELECT * FROM clients WHERE id = '${clientId}'`;
        const clientDetails = await executeQuery(query);
        if(clientDetails.length == 0){
            return res.status(200).send({message : "No client found"});
        }
        res.status(200).json(clientDetails);
    } catch (error) {
        console.error("Error while fetching client details:", error);
        res.status(400).send(error);
    }
}

//Function to fetch all employees for assignment
export const getAllEmployeesForAssignment = async (req, res) => {
    try {
        const { status, designation } = req.query;
        
        // Validate status if provided (only allow valid status values)
        const validStatuses = ['Active', 'Inactive', 'Pending'];
        const validDesignations = ['Employee Salary', 'Employee', 'Team Leader', 'Freelancer', 'Recruiter'];
        
        // Build the WHERE clause based on filters
        let whereConditions = [];
        if (status && status.trim() !== '') {
            // Validate status value
            if (validStatuses.includes(status)) {
                whereConditions.push(`status = '${status}'`);
            }
        }
        if (designation && designation.trim() !== '') {
            // Validate designation value
            if (validDesignations.includes(designation)) {
                whereConditions.push(`designation = '${designation}'`);
            }
        }
        
        // Construct the query
        let query = `SELECT id, employee_id, CONCAT(first_name, ' ', last_name) AS full_name, designation, status FROM employees`;
        if (whereConditions.length > 0) {
            query += ` WHERE ${whereConditions.join(' AND ')}`;
        }
        query += ` ORDER BY employee_id ASC`;
        
        const employees = await executeQuery(query);
        if(employees.length == 0){
            return res.status(200).send({message : "No employees found"});
        }
        res.status(200).json(employees);
    } catch (error) {
        console.error("Error while fetching employees for assignment:", error);
        res.status(400).send(error);
    }
}

//Function to fetch all employees assigned to a particular client
export const assignedEmployees = async (req, res) => {
    try {
        const clientId = req.query.clientId;
        if (!clientId) {
            return res.status(400).json({ message: "Client ID is required" });
        }
        var  query = `SELECT e.id, e.employee_id, e.first_name, e.last_name, cea.assigned_at 
                    FROM client_employee_assignments cea 
                    JOIN employees e ON cea.employee_id = e.id 
                    WHERE cea.client_id = '${clientId}'`;
        const assignedEmployees = await executeQuery(query);
        if(assignedEmployees.length == 0){
            return res.status(200).send({message : "No assigned employees found for this client"});
        }
        res.status(200).json(assignedEmployees);
    } catch (error) {
        console.error("Error while fetching assigned employees to client:", error);
        res.status(400).send(error);
    }
}

//Function to assign a new employee to a particular client
export const assignNewEmployee = async (req, res) => {
    try {
        const {employee_id} = req.body;
        const clientId = req.query.clientId;

        if (!clientId) {
            return res.status(400).json({ message: "Client ID is required" });
        }
        if (!employee_id) {
            return res.status(400).json({ message: "Employee ID is required" });
        }

        var query = `INSERT INTO client_employee_assignments (client_id, employee_id) VALUES ('${clientId}', '${employee_id}')`;
        const newAssignment = await executeQuery(query);

        if (newAssignment.affectedRows !== 1) {
            return res.status(200).json({ message: "Failed to assign employee to client" });
        }
        res.status(200).json({ message: "Employee assigned to client successfully" });
    } catch (error) {
        console.error("Error while assigning new employee to client:", error);
        res.status(400).send(error);
    }
}

//Function to remove an assigned employee from a particular client
export const removeAssignedEmployee = async (req, res) => {
    try {
        const clientId = req.query.clientId;
        const employee_id = req.body.employee_id;  
        if (!clientId) {
            return res.status(400).json({ message: "Client ID is required" });
        }
        if (!employee_id) {
            return res.status(400).json({ message: "Employee ID is required" });
        }
        var  query = `DELETE FROM client_employee_assignments WHERE client_id = '${clientId}' AND employee_id = '${employee_id}'`;
        const removedEmployee = await executeQuery(query);
        if(removedEmployee.affectedRows == 0){
            return res.status(200).json({message : "No assigned employee found for this client"});
        }   
        res.status(200).json({message : "Assigned employee removed from client successfully"});
    } catch (error) {
        console.error("Error while removing assigned employee from client:", error);
        res.status(400).send(error);
    }
}

//Function to fetch all processes of a particular client
export const processesOfClient = async (req, res) => {
    try {
        const clientId = req.query.clientId;
        if (!clientId) {
            return res.status(400).json({ message: "Client ID is required" });
        }
        var query = `SELECT p.id, p.process_name, c.client_name, p.hiring_type, p.payout_amount as display_amount, 
                    p.real_payout_amount as real_amount, p.salary, p.status, 
                    COUNT(DISTINCT s.id) as total_spocs,
                    COUNT(DISTINCT ca.id) as candidate_assigned
                    FROM processes p 
                    LEFT JOIN clients c ON p.client_id = c.id
                    LEFT JOIN spocs s ON p.id = s.process_id 
                    LEFT JOIN candidate_assignments ca ON p.id = ca.process_id
                    WHERE p.client_id = '${clientId}' 
                    GROUP BY p.id, p.process_name, c.client_name, p.hiring_type, p.payout_amount, 
                             p.real_payout_amount, p.salary, p.status
                    ORDER BY p.created_at DESC `;
        const processes = await executeQuery(query);
        if(processes.length == 0){
            return res.status(200).json({message : "No processes found for this client", data: []});
        }   
        res.status(200).json(processes);
    } catch (error) {
        console.error("Error while fetching processes of client:", error);
        res.status(400).send(error);
    }
}

//Function to add a new client
export const addClient = async (req, res) => {
    try {
        const { client_name, cp_name, cp_email, cp_phone, status, address, website, notes } = req.body;
        // const clientId = req.query.clientId;
        // if (!clientId) {
        //     return res.status(400).json({ message: "Client ID is required" });
        // }
        if( !client_name || !cp_name || !cp_email || !cp_phone || !status || !address){
            return res.status(400).json({ message: "Fill all required fields" });
        }

        if (!validator.isEmail(cp_email)) return res.status(400).json({ message: "Invalid email format" });
        if (!/^[0-9+\-\(\) ]{10,20}$/.test(cp_phone)) return res.status(400).json({ message: "Invalid phone number format" });

        var query = `SELECT id FROM clients WHERE cp_email = '${cp_email}'`;
        const isEmailExist = await executeQuery(query);
        if(isEmailExist.length !== 0){
            return res.status(200).json({ message: "Contact person email already exists for another client" });
        }

        var query = `SELECT id FROM clients WHERE cp_phone = '${cp_phone}'`;
        const isPhoneExist = await executeQuery(query);
        if(isPhoneExist.length !== 0){
            return res.status(200).json({ message: "Contact person phone already exists for another client" });
        }

        var query = `INSERT INTO clients (client_name, cp_name, cp_email, cp_phone, status, address, website, notes)
                VALUES ('${client_name}', '${cp_name}', '${cp_email}', '${cp_phone}', '${status}', '${address}', '${website}', '${notes}')`;
        const newClient = await executeQuery(query);
        if(newClient.affectedRows === 0){
            return res.status(400).json({ message: "Failed to add client" });
        }
        res.status(200).json({ message: "Client added successfully" });
    } catch (error) {
        console.error("Error while adding new client:", error);
        res.status(400).send(error);
    }
}

//Function to update an existing client
export const updateClient = async (req, res) => {
    try {
        const { client_name, cp_name, cp_email, cp_phone, status, address, website, notes } = req.body;
        const clientId = req.query.clientId;
        if (!clientId) {
            return res.status(400).json({ message: "Client ID is required" });
        }
        if( !client_name || !cp_name || !cp_email || !cp_phone || !status || !address){
            return res.status(400).json({ message: "Fill all required fields" });
        }

        //Validate email and phone number format
        if (!validator.isEmail(cp_email)) return res.status(400).json({ message: "Invalid email format" });
        if (!/^[0-9+\-\(\) ]{10,20}$/.test(cp_phone)) return res.status(400).json({ message: "Invalid phone number format" });

        //Check if email already exists for another client
        var query = `SELECT id FROM clients WHERE cp_email = '${cp_email}' AND id != '${clientId}'`;
        const isEmailExist = await executeQuery(query);
        if(isEmailExist.length !== 0){
            return res.status(200).json({ message: "Contact person email already exists for another client" });
        }

        //Check if phone already exists for another client
        var query = `SELECT id FROM clients WHERE cp_phone = '${cp_phone}' AND id != '${clientId}'`;
        const isPhoneExist = await executeQuery(query);
        if(isPhoneExist.length !== 0){
            return res.status(200).json({ message: "Contact person phone already exists for another client" });
        }

        //Query to update client details
        var query =` UPDATE clients SET client_name = '${client_name}', cp_name = '${cp_name}',  cp_email = '${cp_email}', cp_phone = '${cp_phone}', 
                status = '${status}', address = '${address}', website = '${website}', notes = '${notes}', updated_at = CURRENT_TIMESTAMP WHERE id = '${clientId}'`;
        const updateClientData = await executeQuery(query);
        if(updateClientData.affectedRows === 0){
            return res.status(400).json({ message: "Failed to update client" });
        }
        res.status(200).json({ message: "Client updated successfully" });
    } catch (error) {
        console.error("Error while updating client:", error);
        res.status(400).send(error)
    }
}

//Function to delete a client
export const deletedClient = async (req, res) => {
    const clientId = req.query.clientId;

    if (!clientId) {
        return res.status(400).json({ message: "Client ID is required" });
    }
    let connection;
    try {
        //Create a database connection
        connection = await db.promise().getConnection();

        // Start a transaction
        await connection.beginTransaction();

        //Query to delete the client
        const query = `DELETE FROM clients WHERE id = '${clientId}'`;
        const [result] = await connection.query(query);

        if (result.affectedRows === 1) {
            // If client deletion is successful, commit the transaction
            await connection.commit();
            return res.status(200).json({ message: "Client deleted successfully" });
        } else {
            // If no rows were affected, rollback the transaction
            await connection.rollback();
            return res.status(404).json({ message: "Client not found" });
        }

    } catch (error) {
        // In case of error, rollback the transaction
        if (connection) await connection.rollback();
        console.error("Error while deleting client:", error);
        return res.status(400).json(error);
    }
}
