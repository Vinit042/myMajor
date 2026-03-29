import { executeQuery } from '../lib/executeQuery.js';
import db from "../lib/db.js";

// Get all processes with client names and SPOC counts
export const getAllProcesses = async (req, res) => {
    try {
        var query = `SELECT c.client_name, p.process_name, p.hiring_type, p.salary, p.status, p.payout_amount as display_amount, p.real_payout_amount as real_amount,
                    COUNT(s.id) AS total_spocs FROM processes p LEFT JOIN spocs s ON p.id = s.process_id LEFT JOIN clients c ON p.client_id = c.id
                    GROUP BY p.id, c.client_name ORDER BY p.created_at DESC`;
        const processes = await executeQuery(query);

        if(processes.length === 0) {
            return res.status(404).json({ message: 'No processes found' });
        }
        res.status(200).json(processes);
    } catch (error) {
        console.error('Error fetching processes:', error);
        res.status(400).json(error);
    }
}

// Add a new process along with its SPOC details
export const addProcess = async (req, res) => {
    const { 
        client_name, 
        process_name, 
        process_description, 
        hiring_type, 
        openings, 
        locations, 
        requirements, 
        salary, 
        interview_dates, 
        clawback_duration, 
        invoice_clear_time, 
        payout_type, 
        payout_amount, 
        real_payout_amount, 
        spocs = []   // array of spoc objects
    } = req.body;

    const requiredFields = [
        client_name, process_name, process_description, hiring_type, openings, 
        locations, requirements, salary, interview_dates, clawback_duration, 
        invoice_clear_time, payout_type, payout_amount, real_payout_amount
    ];

    if (requiredFields.some(field => !field) && spocs.length === 0) {
        return res.status(400).json({ message: "All process fields are required" });
    }

    let connection;

    try {
        // Create a new database connection
        connection = await db.promise().getConnection();
        // Start transaction
        await connection.beginTransaction();

        // Fetch client ID
        const [clientRows] = await connection.query(`SELECT id FROM clients WHERE client_name = ?`, [client_name]);
        if (clientRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Client not found" });
        }
        const clientId = clientRows[0].id;

        // Check if process already exists for this client
        const [existingProcesses] = await connection.query(
            `SELECT id FROM processes WHERE client_id = ? AND process_name = ?`,
            [clientId, process_name]
        );
        if (existingProcesses.length > 0) {
            await connection.rollback();
            return res.status(409).json({ message: "Process already exists for this client" });
        }

        // Insert new process
        const [processResult] = await connection.query(
            `INSERT INTO processes (
                client_id, process_name, process_description, hiring_type,
                openings, locations, requirements, salary, interview_dates,
                clawback_duration, invoice_clear_time, payout_type, payout_amount,
                real_payout_amount, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', NOW())`,
            [
                clientId, process_name, process_description, hiring_type,
                openings, locations, requirements, salary, interview_dates,
                clawback_duration, invoice_clear_time, payout_type, payout_amount,
                real_payout_amount
            ]
        );

        // Get process ID of the newly inserted process
        const process_id = processResult.insertId;

        // Insert SPOC details (loop through objects)
        for (const spoc of spocs) {
            if (spoc.spoc_name && spoc.spoc_phone && spoc.spoc_email && spoc.spoc_role) {
                const [spocResult] = await connection.query(
                    `INSERT INTO spocs (process_id, name, phone, email, role, note, status, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, 'Active', NOW())`,
                    [
                        process_id,
                        spoc.spoc_name,
                        spoc.spoc_phone,
                        spoc.spoc_email,
                        spoc.spoc_role,
                        spoc.spoc_note || null
                    ]
                );

                if (spocResult.affectedRows === 0) {
                    await connection.rollback();
                    return res.status(500).json({ message: 'Failed to add SPOC details' });
                }
            }
        }

        // Commit transaction
        await connection.commit();
        return res.status(200).json({ message: "Process added successfully" });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error adding process:', error);
        return res.status(400).json(error);
    }
}

// View detailed information about a specific process
export const viewProcessDetails = async (req, res) => {
    try {
        const processId = req.query.processId;
        var query = `SELECT p.*, c.client_name FROM processes p JOIN clients c ON p.client_id = c.id WHERE p.id = ?`;
        const processDetails = await executeQuery(query, [processId]);
        if (processDetails.length === 0) {
            return res.status(404).json({ message: 'Process not found' });
        }
        res.status(200).json(processDetails[0]);
    } catch (error) {
        console.error("Error in fetching process details:", error);
        res.status(400).json(error);
    }
}

// Get SPOCs associated with a specific process
export const getProcessSpocs = async (req, res) => {
    try {
        const processId = req.query.processId;
        var query = `SELECT * FROM spocs WHERE process_id = ? ORDER BY created_at`;
        const spocs = await executeQuery(query, [processId]);
        if (spocs.length === 0) {
            return res.status(404).json({ message: 'No SPOCs found for this process' });
        }
        res.status(200).json(spocs);
    } catch (error) {
        console.error("Error in fetching process SPOCs:", error);
        res.status(400).json(error);
    }
}

// Calculate keywords for a process
export const calculateKeywords = async (req, res) => {
    // This section to be completed based on Resume Screening Logic
}

// Manually add keywords for a process
export const addKeywordsManually = async (req, res) => {
    // This section to be completed based on Resume Screening Logic
}

// Get keywords associated with a process
export const getKeywords = async (req, res) => {
    // This section to be completed based on Resume Screening Logic
}

// Edit existing process and its SPOC details
export const updateProcess = async (req, res) => {
    const processId = req.query.processId;
    const { 
        process_name, 
        process_description, 
        hiring_type, 
        openings, 
        locations, 
        requirements, 
        salary, 
        interview_dates, 
        clawback_duration, 
        invoice_clear_time, 
        payout_type, 
        payout_amount, 
        real_payout_amount, 
        new_status,
        spocs = []   
    } = req.body;

    const requiredFields = [
        process_name, process_description, hiring_type, openings, 
        locations, requirements, salary, interview_dates, clawback_duration, 
        invoice_clear_time, payout_type, payout_amount, real_payout_amount, new_status
    ];

    if (requiredFields.some(field => !field)) {
        return res.status(400).json({ message: "All process fields are required" });
    }

    let connection;
    try {
        // Create a new database connection
        connection = await db.promise().getConnection();
        // Start transaction
        await connection.beginTransaction();

        // Update process details
        const [updateProcessResult] = await connection.query(
            `UPDATE processes SET 
                process_name = ?, 
                process_description = ?, 
                hiring_type = ?, 
                openings = ?, 
                locations = ?, 
                requirements = ?, 
                salary = ?, 
                interview_dates = ?, 
                clawback_duration = ?, 
                invoice_clear_time = ?, 
                payout_type = ?, 
                payout_amount = ?, 
                real_payout_amount = ?, 
                status = ?, 
                updated_at = NOW()
            WHERE id = ?`,
            [
                process_name, process_description, hiring_type, openings,
                locations, requirements, salary, interview_dates,
                clawback_duration, invoice_clear_time, payout_type,
                payout_amount, real_payout_amount, new_status, processId
            ]
        );
        if (updateProcessResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Failed to update process' });
        }

        // Delete existing SPOCs 
        await connection.query(`DELETE FROM spocs WHERE process_id = ?`,[processId]);

        // Insert new SPOC details
        for (const spoc of spocs) {
            if (spoc.spoc_name && spoc.spoc_phone && spoc.spoc_email && spoc.spoc_role) {
                const [updateSpocResult] = await connection.query(
                    `INSERT INTO spocs (process_id, name, phone, email, role, note, status, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, 'Active', NOW())`,
                    [
                        processId,
                        spoc.spoc_name,
                        spoc.spoc_phone,
                        spoc.spoc_email,
                        spoc.spoc_role,
                        spoc.spoc_note || null
                    ]
                );

                if (updateSpocResult.affectedRows === 0) {
                    await connection.rollback();
                    return res.status(500).json({ message: 'Failed to update SPOC details' });
                }
            }
        }

        // Commit transaction
        await connection.commit();

        // Fetch updated process
        const [updatedProcess] = await connection.query(
            `SELECT p.*, c.client_name 
                FROM processes p 
                JOIN clients c ON p.client_id = c.id 
                WHERE p.id = ?`,
            [processId]
        );

        // Fetch updated SPOCs
        const [updatedSpocs] = await connection.query(
            `SELECT * FROM spocs WHERE process_id = ? ORDER BY id`,
            [processId]
        );

        return res.status(200).json({
            message: "Process updated successfully",
            process: updatedProcess[0],
            spocs: updatedSpocs
        });

    } catch (error) {
        console.error('Error updating process:', error);
        res.status(400).json(error);
    }
}

// Delete a process and its associated SPOCs
export const deleteProcess = async (req, res) => {
    const processId = req.query.processId;

    let connection;
    try {
        connection = await db.promise().getConnection();
        await connection.beginTransaction();
        
        const [deleteProcessResult] = await connection.query(`DELETE FROM processes WHERE id = ?`, [processId]);
        if (deleteProcessResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Failed to delete process' });
        }

        await connection.commit();
        return res.status(200).json({ message: "Process deleted successfully" });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error in deleting process:", error);
        res.status(400).json(error);
    }
}