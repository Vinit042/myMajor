import { executeQuery } from "../lib/executeQuery.js";

//function to fetch dashboard statistics
export const dashboardStatistics = async (req, res) => {
    try {
        var query = `SELECT COUNT(*) as total FROM clients WHERE status = 'active'`;
        const totalClients = await executeQuery(query);

        var query = `SELECT COUNT(*) as total FROM candidates`;
        const totalCandidates = await executeQuery(query);

        var query = `SELECT COUNT(*) as total FROM employees WHERE status = 'active'`;
        const totalEmployees = await executeQuery(query);

        var query = `SELECT COUNT(*) as total FROM processes WHERE status = 'active'`;
        const totalProcesses = await executeQuery(query);

        var query = `SELECT COUNT(*) as total FROM data_types WHERE is_active = 1`;
        const totalDataTypes = await executeQuery(query);

         // Initialize counts
        let completely_joined = 0;
        let dropout_count = 0;
        let in_process_count = 0;
        let joined_count = 0;
        let selected_count = 0;
        let interview_count = 0;
        let total_assignments = 0;
        let clawback_count = 0;
        let available_count = 0;

        try {
            var query = `
                SELECT 
                    assignment_status,
                    COUNT(*) as count
                FROM candidate_assignments 
                GROUP BY assignment_status`;

            const status_counts = await executeQuery(query);

            status_counts.forEach(status => {
                const count = parseInt(status.count);
                const assignment_status = status.assignment_status;
                total_assignments += count;

                switch (assignment_status) {
                    case 'completely_joined':
                        completely_joined = count;
                        break;
                    case 'dropout':
                    case 'not_interested':
                        dropout_count += count;
                        break;
                    case 'joined':
                        joined_count = count;
                        break;
                    case 'selected':
                        selected_count = count;
                        break;
                    case 'interview_scheduled':
                        interview_count = count;
                        break;
                    case 'clawback':
                        clawback_count = count;
                        break;
                    case 'available':
                        available_count = count;
                        break;
                }

                // In-process statuses
                if (['assigned', 'ringing', 'resume_selected', 'interview_scheduled', 'selected', 'joined', 'clawback', 'invoice'].includes(assignment_status)) {
                    in_process_count += count;
                }
            }
        );

    } catch (error) {
            console.error("Error while fetching candidate assignments:", error);
            return res.status(500).send("Error while fetching candidate assignments");
    }


    const success_rate = total_assignments > 0
    ? Number(((completely_joined + joined_count) / total_assignments * 100).toFixed(1))
    : 0;

    const dropout_rate = total_assignments > 0
    ? Number((dropout_count / total_assignments * 100).toFixed(1))
    : 0;

    const conversion_rate = total_assignments > 0
    ? Number((completely_joined / total_assignments * 100).toFixed(1))
    : 0;

    var query = `SELECT 
                COALESCE(SUM(p.real_payout_amount), 0) AS total_actual_revenue
                FROM candidate_assignments ca
                JOIN processes p ON ca.process_id = p.id
                WHERE ca.assignment_status = 'completely_joined'
                AND YEAR(ca.updated_at) = YEAR(CURDATE())
                AND MONTH(ca.updated_at) = MONTH(CURDATE())`;
    const totalActualRevenue = await executeQuery(query);

    var query = `SELECT COUNT(*) as this_month_assignments FROM candidate_assignments 
                WHERE MONTH(assigned_at) = MONTH(CURRENT_DATE()) 
                AND YEAR(assigned_at) = YEAR(CURRENT_DATE())`;
    const thisMonthAssignments = await executeQuery(query);

    var query = `SELECT COUNT(*) as this_month_completed FROM candidate_assignments 
                WHERE assignment_status = 'completely_joined'
                AND MONTH(updated_at) = MONTH(CURRENT_DATE()) 
                AND YEAR(updated_at) = YEAR(CURRENT_DATE())`;
    const thisMonthCompleted = await executeQuery(query);

    var query = `SELECT COUNT(*) as total FROM broadcast_groups`;
    const activeGroups = await executeQuery(query);

    var query = `SELECT dt.type_name, COUNT(cd.id) as candidate_count FROM data_types dt LEFT JOIN candidates_data cd ON dt.id = cd.type_id
                GROUP BY dt.id, dt.type_name ORDER BY candidate_count DESC LIMIT 5`;
    const dataTypeBreakdown = await executeQuery(query);

    var query = `SELECT e.employee_id, e.full_name, e.designation,
                COUNT(ea.id) as total_assignments,
                SUM(CASE WHEN ea.status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN ea.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN ea.status = 'assigned' THEN 1 ELSE 0 END) as pending
                FROM employees e
                LEFT JOIN employee_assignments ea ON e.employee_id = ea.employee_id
                GROUP BY e.employee_id, e.full_name, e.designation
                ORDER BY total_assignments DESC`;
    const employeePerformance = await executeQuery(query);

    var query = `SELECT e.employee_id, e.full_name, e.designation,
                COUNT(ca.id) as total_assignments,
                SUM(CASE WHEN ca.assignment_status = 'completely_joined' THEN 1 ELSE 0 END) as completely_joined,
                SUM(CASE WHEN ca.assignment_status = 'dropout' THEN 1 ELSE 0 END) as dropout,
                SUM(CASE WHEN ca.assignment_status IN ('available', 'matched', 'assigned', 'ringing', 'resume_selected', 'interview_scheduled', 'selected', 'joined', 'hold') THEN 1 ELSE 0 END) as in_process,
                SUM(CASE WHEN ca.assignment_status IN ('clawback', 'invoice') THEN 1 ELSE 0 END) as other_status
                FROM employees e
                LEFT JOIN candidate_assignments ca ON e.employee_id = ca.assigned_by
                WHERE e.status = 'active'
                GROUP BY e.employee_id, e.full_name, e.designation
                ORDER BY total_assignments DESC`;
    const employeeAssignmentSummary = await executeQuery(query);

    return res.status(200).json({
        totalClients: totalClients[0].total,
        totalCandidates: totalCandidates[0].total,
        totalEmployees: totalEmployees[0].total,
        totalDataTypes: totalDataTypes[0].total,
        totalProcesses: totalProcesses[0].total,
        total_assignments,
        success_rate,
        conversion_rate,
        dropout_rate,
        totalActualRevenue: totalActualRevenue[0].total_actual_revenue,
        completely_joined,
        joined_count,
        selected_count,
        interview_count,
        clawback_count,
        available_count,
        in_process_count,
        dropout_count,
        thisMonthAssignments: thisMonthAssignments[0].this_month_assignments,
        thisMonthCompleted: thisMonthCompleted[0].this_month_completed,
        activeGroups,
        dataTypeBreakdown,
        employeePerformance,
        employeeAssignmentSummary
    });

    }catch (error) {
        console.error("Error while fetching dashboard statistics:", error);
        return res.status(500).send(error);
    }
}

// Function to fetch top performers
export const getTopPerformers = async (req, res) => {
    try {
        var { start_date, end_date } = req.body;
        var query = `SELECT 
                    e.full_name,
                    e.employee_id,
                    e.email as employee_email,
                    e.designation as employee_role,
                    COUNT(ca.id) as completely_joined_count,
                    COALESCE(SUM(p.real_payout_amount), 0) as total_revenue
                    FROM candidate_assignments ca
                    INNER JOIN employees e ON e.id = ca.assigned_by
                    LEFT JOIN processes p ON ca.process_id = p.id
                    WHERE ca.assignment_status = 'completely_joined'
                    AND DATE(ca.updated_at) BETWEEN '${start_date}' AND '${end_date}'
                    GROUP BY e.id, e.full_name, e.employee_id, e.email, e.designation
                    ORDER BY total_revenue DESC, completely_joined_count DESC
                    LIMIT 10`;
        const topPerformers = await executeQuery(query);

        var query = `SELECT 
                        COALESCE(SUM(p.real_payout_amount), 0) as total_company_revenue,
                        COUNT(ca.id) as total_completely_joined
                    FROM candidate_assignments ca
                    LEFT JOIN processes p ON ca.process_id = p.id
                    WHERE ca.assignment_status = 'completely_joined'
                    AND DATE(ca.updated_at) BETWEEN '${start_date}' AND '${end_date}'`;
        const total_revenue = await executeQuery(query);
        const revenueSammary = total_revenue[0];

        const total_company_revenue = revenueSammary?.total_company_revenue || 0;
        const total_completely_joined_all = revenueSammary?.total_completely_joined || 0;

        return res.status(200).json({
            topPerformers,
            total_company_revenue,
            total_completely_joined_all
        });

    } catch (error) {
        console.error("Error while fetching top performers:", error);
        return res.status(500).send(error)
    }
}