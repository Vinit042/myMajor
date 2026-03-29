import fs from 'fs';
import path from 'path';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import { executeQuery } from "../lib/executeQuery.js";
import multer from 'multer';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up multer for file uploads
const tempStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.resolve(__dirname, '../uploads'); // Ensuring the absolute path
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: tempStorage });

// Middleware to handle file uploads for employee documents
export const uploadEmployeeDocs = upload.fields([
    { name: 'aadhar_pic', maxCount: 1 },
    { name: 'pan_pic', maxCount: 1 },
    { name: 'cancelled_cheque_pic', maxCount: 1 }
]);

// Function to generate a unique employee ID
async function generateEmployeeId() {
    try {
        const result = await executeQuery("SELECT employee_id FROM employees ORDER BY id DESC LIMIT 1");

        const lastId = result[0]?.employee_id;

        if (lastId && lastId.startsWith('EMP')) {
            const number = parseInt(lastId.slice(3), 10);
            const newNumber = number + 1;
            const newId = 'EMP' + newNumber.toString().padStart(3, '0');
            return newId;
        } else {
            return 'EMP001';
        }
    } catch (error) {
        console.error('Error generating employee ID:', error);
        throw new Error('Failed to generate employee ID');
    }
}

// Function to get the uploaded file path to store in the database
function getUploadedFilePath(file, type, employeeId) {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedTypes = [".jpg", ".jpeg", ".png", ".gif", ".pdf"];
    
    // Validate the file type
    if (!allowedTypes.includes(ext)) {
        throw new Error(`Only JPG, JPEG, PNG, GIF & PDF files are allowed for ${type}`);
    }

    const fileName = `${employeeId}_${type}${ext}`;
    const uploadDir = path.resolve(__dirname, '../uploads/employees');
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const targetPath = path.join(uploadDir, fileName);

    // Move the file to the target path
    try {
        fs.renameSync(file.path, targetPath);
    } catch (error) {
        console.error('Error while renaming file:', error);
        throw error;
    }

    return `uploads/employees/${fileName}`;
}

// Function to add a new employee
export const addEmployee = async (req, res) => {
    try {
        var {
            first_name, middle_name, last_name, gender, dob, email, recovery_email, phone, aadhar_address, correspondence_address, 
            pan_number, aadhar_number, bank_name, branch_name, ifsc_code, account_number, account_holder_name, password, designation, 
            percentage, show_payout, status, selection_date, joining_date
        } = req.body;
        
        // Validation for required fields
        if (!validator.isEmail(email)) return res.status(400).json({ message: "Invalid email format" });
        if (!validator.isEmail(recovery_email)) return res.status(400).json({ message: "Invalid recovery email format" });
        if (!/^[0-9+\-\(\) ]{10,20}$/.test(phone)) return res.status(400).json({ message: "Invalid phone number format" });
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number)) return res.status(400).json({ message: "Invalid PAN number format" });
        if (!/^\d{12}$/.test(aadhar_number)) return res.status(400).json({ message: "Invalid Aadhar number format" });
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code)) return res.status(400).json({ message: "Invalid IFSC code format" });

        // Check if employee already exists
        const existing = await executeQuery(`SELECT * FROM employees WHERE email = '${email}' OR aadhar_number = '${aadhar_number}'`);
        if (existing.length > 0) {
            return res.status(400).json({ message: "Employee already exists" });
        }
        
        // Generate unique employee ID
        const employee_id = await generateEmployeeId();

        // Check if all required files are uploaded
        const files = req.files;
        if (!files || !files['aadhar_pic'] || !files['pan_pic'] || !files['cancelled_cheque_pic']) {
            return res.status(400).json({ message: "All documents (Aadhar, PAN, Cheque) are required" });
        }

        // Get file path from getUploadedFilePath function
        const aadharPath = getUploadedFilePath(files['aadhar_pic'][0], 'aadhar', employee_id);
        const panPath = getUploadedFilePath(files['pan_pic'][0], 'pan', employee_id);
        const chequePath = getUploadedFilePath(files['cancelled_cheque_pic'][0], 'cheque', employee_id);

        // Generate hashed password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Construct full name
        const fullName = `${first_name} ${middle_name || ''} ${last_name}`.trim();

        // SQL query to add employee data
        var query = `insert into employees(employee_id, full_name, first_name, middle_name, last_name, gender, dob, email, recovery_email, 
        phone, aadhar_address, correspondence_address, pan_number, aadhar_number, aadhar_file_path, pan_file_path, cancelled_cheque_path, 
        bank_name, branch_name, ifsc_code, account_number, account_holder_name, password, designation, percentage, show_payout, selection_date, 
        joining_date, status) 
        values('${employee_id}', '${fullName}', '${first_name}', '${middle_name  || ''}', '${last_name}', '${gender}', '${dob}', '${email}', 
        '${recovery_email}', '${phone}', '${aadhar_address}', '${correspondence_address}', '${pan_number}', '${aadhar_number}', '${aadharPath}', 
        '${panPath}', '${chequePath}', '${bank_name}', '${branch_name}', '${ifsc_code}', '${account_number}', '${account_holder_name}',
        '${hashedPassword}', '${designation}', '${percentage}', '${show_payout}', '${selection_date}', '${joining_date}', '${status}')`;

        const data = await executeQuery(query);

        if (data.affectedRows > 0) {
            res.status(200).json({ message: "Employee added successfully", employeeId: employee_id });
        }
        else {
            res.status(400).json({ message: "Failed to add employee" });
        }
        
    } catch (error) {
        console.error("Error during adding employee:", error);
        res.status(400).send(error);
    }
}

// Function to get all employees with their PIP status
export const getAllEmployees = async (req, res) => {
    try {
        // SQL query to fetch all employees with their PIP status
        const query = `SELECT e.*, 
                        p.id AS pip_id, 
                        p.pip_start_date, 
                        p.pip_end_date, 
                        p.pip_reason, 
                        p.status AS pip_status
                        FROM employees e 
                        LEFT JOIN employee_pip_records p 
                        ON e.employee_id = p.employee_id AND p.status = 'active'`;
        const data = await executeQuery(query);

        // Fetch online status for each employee
        const onlineStatus = await executeQuery(`SELECT employee_id, is_online FROM employee_online_status`);
        const onlineStatusMap = Object.fromEntries(onlineStatus.map(row => [row.employee_id, row.is_online]));
        data.forEach(emp => {
            emp.is_online = onlineStatusMap[emp.employee_id] || 0;
        });


        if (data.length > 0) {
            res.status(200).json(data);
        } else {
            res.status(404).json({ message: "No employee data found" });
        }

    } catch (error) {
        console.error("Error during fetching employees:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// Function to get employee details by ID
export const getEmployeeById = async (req, res) => {
    try {
        var empId = req.query.empId;
        //SQL query to fetch employee details by employee_id
        var query = `select * from employees where employee_id = '${empId}'`;
        const data = await executeQuery(query);

        if (data.length > 0) {
            res.status(200).send(data);
        }
        else {
            res.status(400).json({ message: "Failed to fetch employee details" });
        }

    } catch (error) {
        console.error("Error during fetching employee:", error);
        res.status(400).send(error);
    }
}

// Function to update employee details
export const updateEmployee = async (req, res) => {
    try {
        let {
            employee_id, first_name, middle_name, last_name, gender, dob, email, recovery_email, phone, aadhar_address, correspondence_address,
            pan_number, aadhar_number, bank_name, branch_name, ifsc_code, account_number, account_holder_name, password, designation,
            percentage, show_payout, status, selection_date, joining_date
        } = req.body;
        
        // Validate required fields
        if (!validator.isEmail(email)) return res.status(400).json({ message: "Invalid email format" });
        if (!validator.isEmail(recovery_email)) return res.status(400).json({ message: "Invalid recovery email format" });
        if (!/^[0-9+\-\(\) ]{10,20}$/.test(phone)) return res.status(400).json({ message: "Invalid phone number format" });
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number)) return res.status(400).json({ message: "Invalid PAN number format" });
        if (!/^\d{12}$/.test(aadhar_number)) return res.status(400).json({ message: "Invalid Aadhar number format" });
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code)) return res.status(400).json({ message: "Invalid IFSC code format" });
        

        // Check if employee exists
        const existingEmployee = await executeQuery(`SELECT * FROM employees WHERE employee_id = '${employee_id}'`);
        if (existingEmployee.length === 0) {
            return res.status(400).json({ message: "Employee not found" });
        }

        // Check if the email or Aadhar number already exists for another employee
        const existing = await executeQuery(`SELECT * FROM employees WHERE (email = '${email}' OR aadhar_number = '${aadhar_number}') AND employee_id != '${employee_id}'`);
        if (existing.length > 0) {
            return res.status(400).json({ message: "Email or Aadhar number already exists for another employee" });
        }

        // Check if files are provided for update
        const files = req.files;
        let aadharPath, panPath, chequePath;

        if (files) {
            // Process files if provided
            if (files['aadhar_pic']) {
                aadharPath = getUploadedFilePath(files['aadhar_pic'][0], 'aadhar', employee_id);
            }
            if (files['pan_pic']) {
                panPath = getUploadedFilePath(files['pan_pic'][0], 'pan', employee_id);
            }
            if (files['cancelled_cheque_pic']) {
                chequePath = getUploadedFilePath(files['cancelled_cheque_pic'][0], 'cheque', employee_id);
            }
        }

        // Generate hashed password if provided (only if it's being updated)
        let hashedPassword = existingEmployee[0].password; // Keep existing password if not updating
        if (password) {
            const salt = await bcrypt.genSalt(10);
            hashedPassword = await bcrypt.hash(password, salt);
        }

        // Construct full name
        const fullName = `${first_name} ${middle_name || ''} ${last_name}`.trim();

        // SQL query to update employee data
        let updateQuery = `
            UPDATE employees
            SET
                full_name = '${fullName}',
                first_name = '${first_name}',
                middle_name = '${middle_name || ''}',
                last_name = '${last_name}',
                gender = '${gender}',
                dob = '${dob}',
                email = '${email}',
                recovery_email = '${recovery_email}',
                phone = '${phone}',
                aadhar_address = '${aadhar_address}',
                correspondence_address = '${correspondence_address}',
                pan_number = '${pan_number}',
                aadhar_number = '${aadhar_number}',
                bank_name = '${bank_name}',
                branch_name = '${branch_name}',
                ifsc_code = '${ifsc_code}',
                account_number = '${account_number}',
                account_holder_name = '${account_holder_name}',
                password = '${hashedPassword}',
                designation = '${designation}',
                percentage = '${percentage}',
                show_payout = '${show_payout}',
                selection_date = '${selection_date}',
                joining_date = '${joining_date}',
                status = '${status}'`;

        // Include file paths in the query only if they are updated
        if (aadharPath) {
            updateQuery += `, aadhar_file_path = '${aadharPath}'`;
        }
        if (panPath) {
            updateQuery += `, pan_file_path = '${panPath}'`;
        }
        if (chequePath) {
            updateQuery += `, cancelled_cheque_path = '${chequePath}'`;
        }

        updateQuery += ` WHERE employee_id = '${employee_id}'`;

        const result = await executeQuery(updateQuery);

        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Employee updated successfully" });
        } else {
            res.status(400).json({ message: "Failed to update employee" });
        }
        
    } catch (error) {
        console.error("Error during updating employee:", error);
        res.status(400).send(error);
    }
}

// Function to delete an employee
export const deleteEmployee = async (req, res) => {
    try {
        var empId = req.query.empId;
        //Check if employee exists
        var query = `select * from employees where employee_id = '${empId}'`;
        const data = await executeQuery(query);
        if (data.length === 0) {
            return res.status(400).json({ message: "Employee not found" });
        }

        //SQL query to delete employee
        query = `delete from employees where employee_id = '${empId}'`;
        const result = await executeQuery(query);
        if (result.affectedRows > 0) {
            res.status(200).json({ message: "Employee deleted successfully" });
        } else {
            res.status(400).json({ message: "Failed to delete employee" });
        }
    } catch (error) {
        console.error("Error during deleting employee:", error);
        res.status(400).send(error);
    }
}

// Function to mark PIP
export const markAsPIP = async (req, res) => {
    try {
        var { pip_start_date, pip_end_date, pip_reason, admin_name } = req.body;
        var empId = req.query.empId;

        // Validate required fields
        if (!empId || !pip_start_date || !pip_end_date || !pip_reason || !admin_name) {
        return res.status(400).json({ error: 'Please fill all required fields' });
        }

        const start = new Date(pip_start_date);
        const end = new Date(pip_end_date);
        if (end <= start) {
            return res.status(400).json({ error: 'End date must be after start date' });
        }

        // Check if employee has an active PIP
        var query = `select * from employee_pip_records where employee_id = '${empId}' and status = 'active'`;
        const existingPIP = await executeQuery(query);
        if (existingPIP.length > 0) {
            return res.status(400).json({ message: "Employee has active PIP" });
        }

        // SQL query to insert PIP record
        query = `insert into employee_pip_records(employee_id, pip_start_date, pip_end_date, pip_reason, status, created_by) 
        values('${empId}', '${pip_start_date}', '${pip_end_date}', '${pip_reason}', 'active', '${admin_name}')`;
        const data = await executeQuery(query);

        if (data.affectedRows > 0) {
            res.status(200).json({ message: "Employee marked as PIP successfully" });
        } else {
            res.status(400).json({ message: "Failed to mark employee as PIP" });
        }
        
    } catch (error) {
        console.error("Error during marking employee as PIP:", error);
        res.status(400).send(error);
    }
}

// Function to end PIP
export const endPIP = async (req, res) => {
    try {
        var {pip_id} = req.body;

        // SQL query to end PIP
        var query = `UPDATE employee_pip_records SET status = 'completed' WHERE id = '${pip_id}' AND status = 'active'`;
        const data = await executeQuery(query);
        if (data.affectedRows > 0) {
            res.status(200).json({ message: "PIP ended successfully" });
        } else {
            res.status(400).json({ message: "Failed to end PIP or PIP not found" });
        }
    } catch (error) {
        console.error("Error during ending PIP:", error);
        res.status(400).send(error);
        
    }
}

// Function to add LOP (Loss of Pay)
export const addLOP = async (req, res) => {
    try {
        var empId = req.query.empId;
        var {lop_reason, lop_date, lop_amount} = req.body;
    
        if (!empId || !lop_reason || !lop_date || !lop_amount) {
            return res.status(400).json({ error: 'Please fill all required fields' });
        }
        // SQL query to check if employee exists
        var query = `INSERT INTO employee_lop_records (employee_id, lop_reason, lop_date, lop_amount) VALUES ('${empId}', '${lop_reason}', '${lop_date}', ${lop_amount})`;
        const data = await executeQuery(query);
        if (data.affectedRows > 0) {
            res.status(200).json({ message: "LOP added successfully" });
        } else {
            res.status(400).json({ message: "Failed to add LOP" });
        }
    } catch (error) {
        console.error("Error during adding LOP:", error);
        res.status(400).send(error);
    }
}

// Function to get employee portfolio data
export const getEmployeePortfolio = async (req, res) => {
    try {
        var empId = req.query.empId;
        var { start_date, end_date } = req.body;

        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'Missing start_date or end_date' });
        }
        if (new Date(end_date) <= new Date(start_date)) {
            return res.status(400).json({ error: 'End date must be after start date' });
        }

        var getEmployeeQuery = `SELECT * FROM employees WHERE employee_id = '${empId}'`;
        const employeeData = await executeQuery(getEmployeeQuery);
        if (employeeData.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        var statsQuery = `SELECT 
            new_status,
            COUNT(*) as count,
            DATE(changed_at) as date
            FROM candidate_status_history 
            WHERE employee_id = '${empId}' 
            AND DATE(changed_at) BETWEEN '${start_date}' AND '${end_date}'
            GROUP BY new_status, DATE(changed_at)
            ORDER BY DATE(changed_at) ASC`;
        const statsData = await executeQuery(statsQuery);
        
        var lopQuery = `SELECT 
            DATE(lop_date) as date,
            COUNT(*) as count,
            SUM(lop_amount) as total_amount
            FROM employee_lop_records 
            WHERE employee_id = '${empId}'
            AND DATE(lop_date) BETWEEN '${start_date}' AND '${end_date}'
            GROUP BY DATE(lop_date)
            ORDER BY DATE(lop_date) ASC`;
        const lopData = await executeQuery(lopQuery);
        
        var uniqueStats = `SELECT 
                            latest_status.new_status,
                            COUNT(DISTINCT latest_status.candidate_id) as unique_count
                            FROM (
                                SELECT 
                                    csh.candidate_id,
                                    csh.new_status,
                                    ROW_NUMBER() OVER (
                                        PARTITION BY csh.candidate_id 
                                        ORDER BY csh.changed_at DESC
                                    ) as rn
                                FROM candidate_status_history csh
                                WHERE csh.employee_id = '${empId}'
                                AND DATE(csh.changed_at) BETWEEN '${start_date}' AND '${end_date}'
                            ) latest_status
                            WHERE latest_status.rn = 1
                            GROUP BY latest_status.new_status`;
        const uniqueStatsData = await executeQuery(uniqueStats);

        // Initialize counters
        const metrics = {
            completely_joined: 0,
            joined: 0,
            clawback: 0,
            selected: 0,
            interview_scheduled: 0,
            dropout: 0,
            resume_selected: 0,
            ringing: 0,
            assigned: 0,
            hold: 0,
            invoice: 0,
            lop_records: 0,
            lop_amount: 0,
            total_actions: 0
        };

        // Process unique candidate counts
        uniqueStatsData.forEach((stat) => {
        const status = stat.new_status;
        const count = parseInt(stat.unique_count, 10);

        if (['dropout', 'not_interested'].includes(status)) {
            metrics.dropout += count;
        } else if (metrics.hasOwnProperty(status)) {
            metrics[status] = count;
        }
        });

        // Calculate total candidates worked (excluding lop fields)
        metrics.total_candidates_worked = Object.entries(metrics)
        .filter(([key]) => key !== 'lop_records' && key !== 'lop_amount')
        .reduce((sum, [, value]) => sum + value, 0);

        // Calculate conversion rates
        metrics.conversion_to_interview = metrics.total_candidates_worked > 0
        ? parseFloat(((metrics.interview_scheduled / metrics.total_candidates_worked) * 100).toFixed(1))
        : 0;

        metrics.conversion_to_joined = metrics.total_candidates_worked > 0
        ? parseFloat((((metrics.joined + metrics.completely_joined) / metrics.total_candidates_worked) * 100).toFixed(1))
        : 0;

        metrics.success_rate = metrics.total_candidates_worked > 0
        ? parseFloat((((metrics.completely_joined + metrics.joined + metrics.selected) / metrics.total_candidates_worked) * 100).toFixed(1))
        : 0;

        // Process LOP totals
        lopData.forEach((stat) => {
        metrics.lop_records += parseInt(stat.count, 10);
        metrics.lop_amount += parseFloat(stat.total_amount);
        });

        var actionQuery = `SELECT COUNT(*) as total_actions
                            FROM candidate_work_actions 
                            WHERE employee_id = '${empId}'
                            AND DATE(action_date) BETWEEN '${start_date}' AND '${end_date}'`;
        const actionData = await executeQuery(actionQuery);
        metrics.total_actions = actionData[0]?.total_actions;

        var actionBreakdownQuery = `SELECT 
                                    action_type,
                                    COUNT(*) AS action_count,
                                    SUM(CASE WHEN action_type = 'ring' THEN ring_count ELSE 0 END) AS total_rings
                                    FROM candidate_work_actions 
                                    WHERE employee_id = '${empId}'
                                    AND DATE(action_date) BETWEEN '${start_date}' AND '${end_date}'
                                    AND action_type IN ('ring', 'pass', 'done')
                                    GROUP BY action_type
                                    ORDER BY action_count DESC`;
        const actionBreakdownData = await executeQuery(actionBreakdownQuery);

        var actionDetailQuery = `SELECT 
                                cwa.candidate_id,
                                cwa.action_type,
                                cd.full_name AS candidate_name,
                                cd.mobile_no,
                                cd.email_id,
                                SUM(
                                    CASE 
                                        WHEN cwa.action_type = 'ring' THEN cwa.ring_count
                                        ELSE 0
                                    END
                                ) AS total_ring_count,
                                MAX(cwa.drop_reason) AS drop_reason,
                                MAX(cwa.notes) AS notes,
                                MAX(cwa.action_date) AS last_action_date,
                                COUNT(*) AS action_count
                                FROM candidate_work_actions cwa
                                LEFT JOIN candidates_data cd ON cwa.candidate_id = cd.id
                                WHERE cwa.employee_id = '${empId}'
                                AND DATE(cwa.action_date) BETWEEN '${start_date}' AND '${end_date}'
                                AND cwa.action_type IN ('ring', 'pass', 'done')
                                GROUP BY 
                                    cwa.candidate_id,
                                    cwa.action_type,
                                    cd.full_name,
                                    cd.mobile_no,
                                    cd.email_id
                                ORDER BY last_action_date DESC`;
        const actionDetails = await executeQuery(actionDetailQuery);

        var pipQuery = `SELECT 
                        id,
                        pip_start_date,
                        pip_end_date,
                        pip_reason,
                        status,
                        created_by,
                        created_at,
                        updated_at
                        FROM employee_pip_records 
                        WHERE employee_id = '${empId}' 
                        ORDER BY created_at DESC`;
        const pipRecords = await executeQuery(pipQuery);

        let current_pip = null;
        for (const pip of pipRecords) {
            if (pip.status === 'active') {
                current_pip = pip;
                break;
            }
        }

        var revenueQuery = `SELECT 
                            e.show_payout,
                            ca.candidate_id,
                            ca.process_id,
                            p.payout_amount,
                            p.real_payout_amount
                            FROM employees e
                            INNER JOIN candidate_assignments ca ON e.id = ca.assigned_by
                            INNER JOIN processes p ON ca.process_id = p.id
                            WHERE e.employee_id = '${empId}' 
                            AND ca.assignment_status = 'completely_joined'
                            AND DATE(ca.updated_at) BETWEEN '${start_date}' AND '${end_date}'`;
        const revenueData = await executeQuery(revenueQuery);

        let total_revenue = 0;
        for (const revenue of revenueData) {
            if (revenue.show_payout === 'fake') {
                total_revenue += parseFloat(revenue.payout_amount);
            } else {
                total_revenue += parseFloat(revenue.real_payout_amount);
            }
        }
        metrics.total_revenue = total_revenue;

        var uniqueCandidateQuery = `SELECT 
                                    c.id AS candidate_id,
                                    c.name AS candidate_name,
                                    c.email AS candidate_email,
                                    c.phone AS candidate_phone,
                                    csh.new_status AS latest_status,
                                    csh.change_reason,
                                    csh.changed_at AS last_updated,
                                    p.process_name,
                                    cl.client_name
                                FROM (
                                    SELECT 
                                        candidate_id,
                                        MAX(changed_at) AS latest_change
                                    FROM candidate_status_history 
                                    WHERE employee_id = '${empId}'
                                    AND DATE(changed_at) BETWEEN '${start_date}' AND '${end_date}'
                                    GROUP BY candidate_id
                                ) latest_changes
                                INNER JOIN candidate_status_history csh 
                                    ON latest_changes.candidate_id = csh.candidate_id 
                                    AND latest_changes.latest_change = csh.changed_at
                                    AND csh.employee_id = '${empId}'
                                INNER JOIN candidates c ON csh.candidate_id = c.id
                                LEFT JOIN candidate_assignments ca ON c.id = ca.candidate_id
                                LEFT JOIN processes p ON ca.process_id = p.id
                                LEFT JOIN clients cl ON p.client_id = cl.id
                                ORDER BY csh.changed_at DESC`;
        const uniqueCandidateData = await executeQuery(uniqueCandidateQuery);


    // Data require to generate the chart
        // Generate date range
        const dates = [];
        let currentDate = new Date(start_date);
        const endDate = new Date(end_date);

        while (currentDate <= endDate) {
            dates.push(currentDate.toISOString().slice(0, 10)); // yyyy-mm-dd
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Initialize chart_data
        const status_types = ['completely_joined', 'joined', 'clawback', 'dropout', 'lop', 'revenue'];
        const chart_data = {};
        status_types.forEach(type => {
            chart_data[type] = new Array(dates.length).fill(0);
        });

        statsData.forEach(stat => {
            const { new_status, date, count } = stat;
            const dateIndex = dates.indexOf(date);
            if (dateIndex !== -1) {
                if (new_status === 'completely_joined') chart_data['completely_joined'][dateIndex] += count;
                else if (new_status === 'joined') chart_data['joined'][dateIndex] += count;
                else if (new_status === 'clawback') chart_data['clawback'][dateIndex] += count;
                else if (['dropout', 'not_interested'].includes(new_status)) chart_data['dropout'][dateIndex] += count;
            }
        });

        lopData.forEach(stat => {
            const { date, total_amount } = stat;
            const dateIndex = dates.indexOf(date);
            if (dateIndex !== -1) {
                chart_data['lop'][dateIndex] += parseFloat(total_amount);
            }
        });

        var revenueDailyQuery = `SELECT 
                                DATE(ca.updated_at) as date,
                                SUM(CASE 
                                    WHEN e.show_payout = 'fake' THEN p.payout_amount 
                                    ELSE p.real_payout_amount 
                                END) as daily_revenue
                                FROM employees e
                                INNER JOIN candidate_assignments ca ON e.id = ca.assigned_by
                                INNER JOIN processes p ON ca.process_id = p.id
                                WHERE e.employee_id = '${empId}'
                                AND ca.assignment_status = 'completely_joined'
                                AND DATE(ca.updated_at) BETWEEN '${start_date}' AND '${end_date}'
                                GROUP BY DATE(ca.updated_at)
                                ORDER BY date ASC`;
        const revenueDailyData = await executeQuery(revenueDailyQuery);
        
        revenueDailyData.forEach(stat => {
            const { date, daily_revenue } = stat;
            const dateIndex = dates.indexOf(date);
            if (dateIndex !== -1) {
                chart_data['revenue'][dateIndex] += parseFloat(daily_revenue);
            }
        });

        return res.status(200).json({
            message: "Data for employee portfolio fetched successfully",
            metrics,
            pipRecords,
            current_pip,
            actionBreakdownData,
            actionDetails,
            uniqueCandidateData,
            chart_data,
            dates,
        });
      
    } catch (error) {
        console.error("Error during fetching employee portfolio:", error);
        res.status(400).send(error);
    }
}
