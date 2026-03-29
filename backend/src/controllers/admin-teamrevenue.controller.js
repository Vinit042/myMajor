import { executeQuery } from '../lib/executeQuery.js';

// Function to calculate revenue for an employee
async function calculateEmployeeRevenue(employeeId, showPayout, dateFilter, dateParams) {
    var query = `
        SELECT p.payout_amount, p.real_payout_amount
        FROM candidate_assignments ca
        JOIN processes p ON ca.process_id = p.id
        WHERE ca.assigned_by = ? 
        AND ca.assignment_status = 'completely_joined' ${dateFilter}
    `;

    const rows = await executeQuery(query, [employeeId, ...dateParams]);

    // Calculate revenue based on showPayout preference
    return rows.reduce((sum, row) => {
        if (showPayout === "fake") {
            return sum + Number(row.payout_amount || 0);
        } else {
            return sum + Number(row.real_payout_amount ?? row.payout_amount ?? 0);
        }
    }, 0);
}

// Function to calculate actual revenue for an employee (ignores showPayout)
async function calculateActualRevenue(employeeId, dateFilter, dateParams) {
    var query = `
        SELECT p.payout_amount, p.real_payout_amount
        FROM candidate_assignments ca
        JOIN processes p ON ca.process_id = p.id
        WHERE ca.assigned_by = ? 
        AND ca.assignment_status = 'completely_joined' ${dateFilter}
    `;

    const rows = await executeQuery(query, [employeeId, ...dateParams]);

    // Calculate actual revenue
    return rows.reduce((sum, row) => {
        return sum + Number(row.real_payout_amount ?? row.payout_amount ?? 0);
    }, 0);
}

// Function to get team members and their revenues
async function getTeamMembers(teamId, dateFilter, dateParams) {
    var query = `
        SELECT e.id, e.employee_id, e.full_name, e.first_name, e.last_name,
            e.email, e.phone, e.designation, e.show_payout, tm.joined_at
        FROM team_members tm
        JOIN employees e ON tm.employee_id = e.id
        WHERE tm.team_id = ?
        ORDER BY e.full_name
    `;

    const members = await executeQuery(query, [teamId]);   

    // Calculate revenue and actual revenue for each member
    for (let member of members) {
        member.revenue = await calculateEmployeeRevenue(
        member.id,
        member.show_payout,
        dateFilter,
        dateParams
        );
        member.actual_revenue = await calculateActualRevenue(
        member.id,
        dateFilter,
        dateParams
        );
    }

    return members;
}

// Function to get team revenue data
export const getTeamRevenue = async(req, res) => {
    try {
        const timePeriod = req.body?.timePeriod || "all_time";
        const fromDate = req.body?.fromDate || null;
        const toDate = req.body?.toDate || null;

        // Handle date filtering based on timePeriod
        let dateFilter = "";
        let dateParams = [];

        if (timePeriod === "custom" && fromDate && toDate) {
            dateFilter = "AND DATE(ca.updated_at) BETWEEN ? AND ?";
            dateParams = [fromDate, toDate];
        }
        else if (timePeriod !== "all_time") {
            switch (timePeriod) {
                case "this_month":
                dateFilter = "AND YEAR(ca.updated_at) = YEAR(CURDATE()) AND MONTH(ca.updated_at) = MONTH(CURDATE())";
                break;
                case "last_month":
                dateFilter = "AND YEAR(ca.updated_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(ca.updated_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))";
                break;
                case "this_quarter":
                dateFilter = "AND YEAR(ca.updated_at) = YEAR(CURDATE()) AND QUARTER(ca.updated_at) = QUARTER(CURDATE())";
                break;
                case "this_year":
                dateFilter = "AND YEAR(ca.updated_at) = YEAR(CURDATE())";
                break;
            }
        }

        var query = `SELECT t.id, t.team_name, t.team_type, t.destination, t.leader_id,
                    e.employee_id AS leader_employee_id, e.full_name AS leader_name,
                    e.first_name AS leader_first_name, e.last_name AS leader_last_name,
                    e.email AS leader_email, e.phone AS leader_phone,
                    e.designation AS leader_designation
                    FROM teams t
                    LEFT JOIN employees e ON t.leader_id = e.id
                    ORDER BY t.team_name`;

        const teams = await executeQuery(query);

        // For each team, get members and their revenues
        let teamData = [];
        for (let team of teams) {
            const members = await getTeamMembers(team.id, dateFilter, dateParams) || [];
            const totalRevenue = members.reduce((sum, m) => sum + m.revenue, 0);
            const totalActualRevenue = members.reduce((sum, m) => sum + m.actual_revenue, 0);

            teamData.push({
                team,
                members,
                total_revenue: totalRevenue,
                total_actual_revenue: totalActualRevenue,
                member_count: members.length,
            });
        }

        // Sort teams by revenue descending
        teamData.sort((a, b) => b.total_revenue - a.total_revenue);

        return res.status(200).json(teamData);

    } catch (error) {
        console.error("Error while fetching team revenue", error);
        res.status(400).json(error);
    }
}
