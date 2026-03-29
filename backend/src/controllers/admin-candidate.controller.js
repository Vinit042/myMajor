import { executeQuery } from '../lib/executeQuery.js';
import db from "../lib/db.js";

export const getAllCandidates = async (req, res) => {
    try {
        const search = req.body.search || "";
        const search_type = req.body.search_type || "all";
        const status_filter = req.body.status || "All";

        var query = `SELECT 
                        c.*,
                        ca.assignment_status,
                        ca.matching_score,
                        ca.assigned_at,
                        ca.assigned_by,
                        p.process_name,
                        p.client_id,
                        cl.client_name,
                        e.employee_id,
                        e.full_name as assigned_employee_name,
                        uploader.employee_id as uploader_employee_id,
                        uploader.full_name as uploader_name
                    FROM candidates c
                    LEFT JOIN candidate_assignments ca ON c.id = ca.candidate_id
                    LEFT JOIN processes p ON ca.process_id = p.id
                    LEFT JOIN clients cl ON p.client_id = cl.id
                    LEFT JOIN employees e ON ca.assigned_by = e.id
                    LEFT JOIN employees uploader ON c.uploaded_by_employee_id = uploader.id`;
        const whereConditions = [];
        const params = [];

        if (search) {
            switch (search_type) {
                case "candidate":
                    whereConditions.push("(c.name LIKE ? OR c.email LIKE ?)");
                    params.push(`%${search}%`, `%${search}%`);
                    break;
                case "candidate_id":
                    whereConditions.push("c.id LIKE ?");
                    params.push(`%${search}%`);
                    break;
                case "client":
                    whereConditions.push("cl.client_name LIKE ?");
                    params.push(`%${search}%`);
                    break;
                case "process":
                    whereConditions.push("p.process_name LIKE ?");
                    params.push(`%${search}%`);
                    break;
                case "employee":
                    whereConditions.push("(e.employee_id LIKE ? OR e.full_name LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ?)");
                    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
                    break;
                case "all":
                default:
                    whereConditions.push(`(
                        c.name LIKE ? OR 
                        c.email LIKE ? OR 
                        c.phone LIKE ? OR 
                        c.id LIKE ? OR
                        cl.client_name LIKE ? OR 
                        p.process_name LIKE ? OR 
                        e.employee_id LIKE ? OR 
                        e.full_name LIKE ? OR
                        e.first_name LIKE ? OR
                        e.last_name LIKE ?
                    )`);
                    for (let i = 0; i < 10; i++) {
                        params.push(`%${search}%`);
                    }
                    break;
            }
        }

        if (status_filter !== "All") {
            whereConditions.push("ca.assignment_status = ?");
            params.push(status_filter);
        }

        if (whereConditions.length > 0) {
            query += " WHERE " + whereConditions.join(" AND ");
        }

        query += " ORDER BY ca.matching_score DESC, c.name";

        const candidates = await executeQuery(query, params);
        if(candidates.length === 0) {
            return res.status(404).json({ message: "No candidates found" });
        }
        res.status(200).json(candidates);
    } catch (error) {
        console.error('Error while fetching candidates:', error);
        res.status(400).json(error);
    }
}

export const statsByAssignmentStatus = async (req, res) => {
    try {
        var query = `SELECT 
                    assignment_status, 
                    COUNT(*) as count 
                    FROM candidate_assignments ca
                    LEFT JOIN candidates c ON ca.candidate_id = c.id
                    GROUP BY assignment_status 
                    ORDER BY count DESC`;
        const stats = await executeQuery(query);
        res.status(200).json(stats);
    } catch (error) {
        console.error('Error fetching candidate stats:', error);
        res.status(400).json(error);
    }
}

export const getCandidateById = async (req, res) => {
    try {
        const candidateId = req.query.candidateId;
        if(!candidateId) {
            return res.status(400).json({ message: "Candidate ID is required" });
        }

        var query = `SELECT 
                    c.*,
                    ca.assignment_status,
                    ca.matching_score,
                    ca.assigned_at,
                    ca.assigned_by,
                    p.process_name,
                    p.client_id,
                    cl.client_name,
                    e.employee_id,
                    e.full_name as assigned_employee_name,
                    e.email as assigned_employee_email
                    FROM candidates c
                    LEFT JOIN candidate_assignments ca ON c.id = ca.candidate_id
                    LEFT JOIN processes p ON ca.process_id = p.id
                    LEFT JOIN clients cl ON p.client_id = cl.id
                    LEFT JOIN employees e ON ca.assigned_by = e.id
                    WHERE c.id = ?`;
        const condidateDetalis = await executeQuery(query, candidateId);
        if(condidateDetalis.length === 0) {
            return res.status(404).json({ message: "Candidate not found" });
        }
        res.status(200).json(condidateDetalis);
    } catch (error) {
        console.error('Error while fetching candidate by ID:', error);
        res.status(400).json(error);
    }
}

export const candidateHistory = async (req, res) => {
    try {
        const candidateId = req.query.candidateId;
        if(!candidateId) {
            return res.status(400).json({ message: "Candidate ID is required" });
        }

        var query = `SELECT 
                    csh.id,
                    csh.candidate_id,
                    csh.employee_id,
                    csh.old_status,
                    csh.new_status,
                    csh.change_reason,
                    csh.changed_at,
                    e.first_name,
                    e.last_name
                    FROM candidate_status_history csh
                    LEFT JOIN employees e ON csh.employee_id = e.employee_id
                    WHERE csh.candidate_id = ?
                    ORDER BY csh.changed_at DESC`;
        const history = await executeQuery(query, candidateId);
        if(history.length === 0) {
            return res.status(404).json({ message: "No history found" });
        }
        res.status(200).json(history);
    } catch (error) {
        console.error('Error while fetching candidate history:', error);
        res.status(400).json(error);
    }
}

export const getMatchingScore = async (req, res) => {
    try {
        const candidateId = req.query.candidateId;
        if(!candidateId) {
            return res.status(400).json({ message: "Candidate ID is required" });
        }

        var query = `SELECT 
                        cpm.id,
                        cpm.candidate_id,
                        cpm.process_id,
                        cpm.matching_score,
                        cpm.matched_keywords,
                        cpm.total_candidate_keywords,
                        cpm.total_process_keywords,
                        cpm.skill_matches,
                        cpm.language_matches,
                        cpm.education_matches,
                        cpm.location_matches,
                        cpm.hiring_type_matches,
                        cpm.created_at,
                        cpm.updated_at,
                        p.process_name,
                        p.payout_amount,
                        p.hiring_type,
                        p.status as process_status,
                        c.client_name
                        FROM candidate_process_matches cpm
                        JOIN processes p ON cpm.process_id = p.id
                        JOIN clients c ON p.client_id = c.id
                        WHERE cpm.candidate_id = ?
                        ORDER BY cpm.matching_score DESC, p.process_name ASC`;
        const matchingScores = await executeQuery(query, candidateId);
        if(matchingScores.length === 0) {
            return res.status(404).json({ message: "No matching scores found" });
        }
        res.status(200).json(matchingScores);
    } catch (error) {
        console.error('Error while fatching matching scores:', error);
        res.status(400).json(error);
    }
}

// export const assignCandidateToProcess = async (req, res) => {
//     const candidateId = req.query.candidateId;
//     const { processId, admin_id } = req.body;
//     console.log("Assigning candidate:", candidateId, "to process:", processId, "by admin:", admin_id);
//     if(!candidateId || !processId) {
//         return res.status(400).json({ message: "Candidate ID and Process ID are required" });
//     }

//     let connection;
//     try {
//         connection = await db.promise().getConnection();
//         await connection.beginTransaction();
//         console.log("Database connection established and transaction started");

//         var query  = `SELECT id, process_id, assigned_by FROM candidate_assignments WHERE candidate_id = ?`;
//         const existingAssignment = await connection.query(query, candidateId);
//         console.log("Existing assignment fetched:", existingAssignment);

//         const currentlyAssignedToEmployee = existingAssignment[0][0].assigned_by;
//         console.log("Currently assigned to employee ID:", currentlyAssignedToEmployee);

//         if(existingAssignment && currentlyAssignedToEmployee) {
//             var query = `SELECT id, employee_id, full_name FROM employees WHERE id = ?`;
//             const employee = await connection.query(query, currentlyAssignedToEmployee);
//             console.log("Employee details fetched:", employee);
//         }

//         var query = `SELECT matching_score FROM candidate_process_matches WHERE candidate_id = ? AND process_id = ?`;
//         const matchingScore = await connection.query(query, [candidateId, processId]);
//         console.log("Matching score fetched:", matchingScore);

//         const matching_score_value = matchingScore.length > 0 ? matchingScore[0].matching_score : null;
//         console.log("Matching score value:", matching_score_value);

//         if(existingAssignment.length > 0) {
//             const assignedByEmployee = currentlyAssignedToEmployee ? currentlyAssignedToEmployee : admin_id;
//             var query = `UPDATE candidate_assignments 
//                         SET process_id = ?, assignment_status = 'assigned',
//                         matching_score = ?, assigned_at = CURRENT_TIMESTAMP,
//                         assigned_by = ?, updated_at = CURRENT_TIMESTAMP
//                         WHERE candidate_id = ?`;
//             const reassignResult = await connection.query(query, [processId, matching_score_value, assignedByEmployee, candidateId]);
//             console.log("Reassignment result:", reassignResult);
//             if(reassignResult.affectedRows === 0) {
//                 await connection.rollback();
//                 return res.status(500).json({ message: "Failed to reassign candidate to process" });
//             }
//         }
//         else {
//             var query = `INSERT INTO candidate_assignments 
//                         (candidate_id, process_id, assignment_status, matching_score,
//                         assigned_at, assigned_by, created_at, updated_at)
//                         VALUES (?, ?, 'assigned', ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
//             const assignResult = await connection.query(query, [candidateId, processId, matching_score_value, admin_id]);
//             console.log("Assignment result:", assignResult);
//             if(assignResult.affectedRows === 0) {
//                 await connection.rollback();
//                 return res.status(500).json({ message: "Failed to assign candidate to process" });
//             }
//         }

//         await connection.commit();
//         res.status(200).json({ message: "Candidate assigned to process successfully" });
//     } catch (error) {
//         if(connection) await connection.rollback();
//         console.error('Error while assigning candidate to process:', error);
//         res.status(400).json(error);
//     }
// }

export const assignProcessToCandidate = async (req, res) => {
    try {
        const candidateId = req.query.candidateId;
        const { processId, admin_id } = req.body;
        console.log("Assigning candidate:", candidateId, "to process:", processId, "by admin:", admin_id);
        if(!candidateId || !processId) {
            return res.status(400).json({ message: "Candidate ID and Process ID are required" });
        }

        var query  = `SELECT id, process_id, assigned_by FROM candidate_assignments WHERE candidate_id = ? AND process_id = ?`;
        const existingAssignment = await executeQuery(query, [candidateId, processId]);
        console.log("Existing assignment fetched:", existingAssignment);
        if (existingAssignment.length > 0) {
            return res.status(400).json({ message: "Candidate is already assigned this a process" });
        }

        var query = `SELECT matching_score FROM candidate_process_matches WHERE candidate_id = ? AND process_id = ?`;
        const matchingScore = await connection.query(query, [candidateId, processId]);
        console.log("Matching score fetched:", matchingScore);

        const matching_score_value = matchingScore.length > 0 ? matchingScore[0].matching_score : null;
        console.log("Matching score value:", matching_score_value);

        var query = `INSERT INTO candidate_assignments 
                        (candidate_id, process_id, assignment_status, matching_score,
                        assigned_at, assigned_by, created_at, updated_at)
                        VALUES (?, ?, 'assigned', ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
        const processAssignResult = await executeQuery(query, [candidateId, processId, matching_score_value, admin_id]);
        console.log("Assignment result:", processAssignResult);
        if(processAssignResult.affectedRows === 0) {
            return res.status(500).json({ message: "Failed to assign candidate to process" });
        }

        res.status(200).json({ message: "Candidate assigned to process successfully" });

    } catch (error) {
        console.error('Error while assigning process to candidate:', error);
        res.status(400).json(error);
    }
}

// export const assignCandidateToEmployee = async (req, res) => {
//     try {
        
//     } catch (error) {
//         console.error('Error while assigning candidate to employee:', error);
//         res.status(400).json(error);
//     }
// }

export const reassignCandidateToEmployee = async (req, res) => {
    try {
        const { candidateId, employeeId } = req.body;
        if(!candidateId || !employeeId) {
            return res.status(400).json({ message: "Candidate ID and Employee ID are required" });
        }
        var query = `select employee_id from employees where id = ?`;
        const employee_id = await executeQuery(query);

        var query = `SELECT id, employee_id, candidate_id
                    FROM employee_assignments
                    WHERE employee_id = ? AND candidate_id = ?`;
        const existingAssignment = await executeQuery(query, [employee_id, candidateId]);
        if(existingAssignment.length > 0) {
            return res.status(400).json({ message: "Candidate is already assigned to this employee" });
        }

        var query = `update employee_assignments set employee_id = ? where candidate_id= ? AND employee_id= ?`;
        const reassignmentResult = await executeQuery(query, [employee_id, candidateId, employee_id]);
        if (reassignmentResult.affectedRows === 0){
            return res.status(200).json({ message: "Cannot assign this candidte to this employee" });
        }

        res.status(200).json({ message: "Sucessfully assign candidate to employee: ",employee_id })
    } catch (error) {
        console.error('Error while reassigning candidate to employee:', error);
        res.status(400).json(error);
    }
}

export const changeAssignmentStatus = async (req, res) => {

}

export const deleteCandidate = async (req, res) => {

}