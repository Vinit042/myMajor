import { executeQuery } from "../lib/executeQuery.js";
import db from "../lib/db.js";

// Get all teams with leader name and member count
export const getAllTeams = async (req, res) => {
    try {
        var query = `SELECT t.*, 
                    e.full_name as leader_name,
                    COUNT(tm.id) as member_count
                    FROM teams t
                    LEFT JOIN employees e ON t.leader_id = e.id
                    LEFT JOIN team_members tm ON t.id = tm.team_id
                    GROUP BY t.id
                    ORDER BY t.created_at DESC`;
        const availableTeams = await executeQuery(query);
        if(availableTeams.length === 0) {
            return res.status(404).json({ message: "No teams found" });
        }
        res.status(200).json(availableTeams);
    } catch (error) {
        console.error("Error while fetching teams:", error);
        res.status(400).json(error);
    }
}

// Get all members of a specific team
export const getTeamMembers = async (req, res) => {
    try {
        const teamId = req.query.teamId;
        if(!teamId) {
            return res.status(400).json({ message: "Team ID is required" });
        }
        var query = `SELECT e.full_name, e.designation, tm.joined_at
                    FROM team_members tm
                    JOIN employees e ON tm.employee_id = e.id
                    WHERE tm.team_id = ?
                    ORDER BY tm.joined_at ASC`;
        const teamMembers = await executeQuery(query, [teamId]);
        if(teamMembers.length === 0) {
            return res.status(404).json({ message: "No team members found" });
        }
        res.status(200).json(teamMembers);
    } catch (error) {
        console.error("Error while fetching team members:", error);
        res.status(400).json(error);
    }
}

// Get all active employees for dropdown and checkbox lists
export const getAllEmployees = async (req, res) => {
    try {
        var query = `SELECT id, full_name, designation FROM employees WHERE status = 'active' ORDER BY full_name`;
        const employeesForDroupdown = await executeQuery(query);
        if(employeesForDroupdown.length === 0) {
            return res.status(404).json({ message: "No employees found" });
        }
        res.status(200).json(employeesForDroupdown);
    } catch (error) {
        console.error("Error while fetching employees:", error);
        res.ststus(400).json(error);
    }
}

// Add a new team with members
export const addteam = async (req, res) => {
    const { team_name, team_type, destination, leader_id, members = [] } = req.body;
    if(!team_name && !team_type && !destination && !leader_id && members.length === 0) {
        return res.status(400).json({ message: "All fields are required" });
    }

    let connection;
    try {
        // Create a new database connection
        connection = await db.promise().getConnection();
        // Start transaction
        await connection.beginTransaction();

        // Insert new team
        var query = `INSERT INTO teams (team_name, team_type, destination, leader_id) VALUES (?, ?, ?, ?)`;
        const addTeamResult = await connection.query(query, [team_name, team_type, destination, leader_id]);;
        if(addTeamResult[0].affectedRows === 0) {
            await connection.rollback();
            return res.status(400).json({ message: "Failed to add team" });
        }

        // Get the ID of the newly inserted team
        const team_id = addTeamResult[0].insertId;

        // Insert team members
        for (const member of members) {
            const addMemberResult = await connection.query(`INSERT INTO team_members (team_id, employee_id) VALUES (?, ?)`,[team_id, member.member_id] );
            if(addMemberResult[0].affectedRows === 0) {
                await connection.rollback();
                return res.status(400).json({ message: "Failed to add team member" });
            }
        }

        // Commit transaction
        await connection.commit();
        res.status(200).json({ message: "Team added successfully" });

    } catch (error) {
        if(connection) await connection.rollback();
        console.error("Error while adding team:", error);
        res.status(400).json(error);
    }
}

// Get details of a specific team
export const getTeamDetails = async (req, res) => {
    try {
        const teamId = req.query.teamId;
        if(!teamId) {
            return res.status(400).json({ message: "Team ID is required" });
        }
        var query = ` SELECT t.*, e.full_name as leader_name FROM teams t LEFT JOIN employees e ON t.leader_id = e.id WHERE t.id = ?`;
        const teamDetails = await executeQuery(query, [teamId]);  
        res.status(200).json(teamDetails);
    } catch (error) {
        console.error("Error while fetching team details:", error);
        res.status(400).json(error);
    }
}

// Edit an existing team and its members
export const updateTeam = async (req, res) => {
    const teamId = req.query.teamId;
    if(!teamId) {
        return res.status(400).json({ message: "Team ID is required" });
    }
    const { team_name, team_type, destination, leader_id, members = [] } = req.body;
    if(!team_name && !team_type && !destination && !leader_id && members.length === 0) {
        return res.status(400).json({ message: "All fields are required" });
    }

    let connection;
    try {
        connection = await db.promise().getConnection();
        await connection.beginTransaction();

        // Update team details
        var query = `UPDATE teams SET team_name = ?, team_type = ?, destination = ?, leader_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        const updateTeamResult = await connection.query(query, [team_name, team_type, destination, leader_id, teamId]);
        if(updateTeamResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(400).json({ message: "Failed to update team" });
        }

        //Detele existing team members
        await connection.query(`DELETE FROM team_members WHERE team_id = ?`, [teamId]);

        // Insert new team members
        for (const member of members) {
            const addMemberResult = await connection.query(`INSERT INTO team_members (team_id, employee_id) VALUES (?, ?)`,[teamId, member.member_id] );
            if(addMemberResult[0].affectedRows === 0) {
                await connection.rollback();
                return res.status(400).json({ message: "Failed to add team member" });
            }
        }

        await connection.commit();
        res.status(200).json({ message: "Team updated successfully" });

    } catch (error) {
        if(connection) await connection.rollback();
        console.error("Error while updating team:", error); 
        res.status(400).json(error);
    }
}

// Delete a team and its members
export const deleteTeam = async (req, res) => {
    const teamId = req.query.teamId;
    if(!teamId) {
        return res.status(400).json({ message: "Team ID is required" });
    }
    let connection;
    try {
        connection = await db.promise().getConnection();
        await connection.beginTransaction();

        // var query = `DELETE FROM team_members WHERE team_id = ?`;
        // await connection.query(query, [teamId]);

        var query = `DELETE FROM teams WHERE id = ?`;
        const deleteTeamResult = await connection.query(query, [teamId]);
        if(deleteTeamResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(400).json({ message: "Failed to delete team" });
        }

        await connection.commit();
        res.status(200).json({ message: "Team deleted successfully" });
        
    } catch (error) {
        if(connection) await connection.rollback();
        console.error("Error while deleting team:", error);
        res.ststus(400).json(error);
    }
}