import { executeQuery } from "../lib/executeQuery.js";

// Add a new meeting
export const addNewMeeting = async(req, res) => {
    try {
        const {meetingName, googleMeetLink, members, description, meetingDate, durationMinutes, adminName} = req.body;
        // Ckeck if meeting nmae and meeting link exist
        if (!meetingName || !googleMeetLink) {
            return res.status(400).json({message: "Meeting name and Google Meet link are required"});
        }
        const membersArray = members.split(',').map(m => m.trim());
        const membersJson = JSON.stringify(membersArray);

        var query = `INSERT INTO meetings (meeting_name, google_meet_link, members, description, meeting_date, duration_minutes, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const addMeetingResult = await executeQuery(query, [meetingName, googleMeetLink, membersJson, description, meetingDate, durationMinutes, adminName]);
        if (addMeetingResult.affectedRows === 0) {
            return res.status(200).json({message: "Failed to add new meeting"});
        }

        res.status(200).json({message: "New meeting added successfully"});
    } catch (error) {
        console.error("Error while adding new meeting:" ,error);
        return res.status(400).json(error);
    }
}

// Update an existing meeting
export const updateMeeting = async(req, res) => {
    try {
        const meetingId = req.query.meetingId;
        if (!meetingId){
            return res.status(400).json({message: "Meeting ID is required"});
        }

        const {meetingName, googleMeetLink, members, description, meetingDate, durationMinutes, status} = req.body;
        if (!meetingName || !googleMeetLink) {
            return res.status(400).json({message: "Meeting name and Google Meet link are required"});
        }

        // transform members string to json array
        const membersArray = members.split(',').map(m => m.trim());
        const membersJson = JSON.stringify(membersArray);

        var query = `UPDATE meetings SET meeting_name = ?, google_meet_link = ?, members = ?, description = ?, meeting_date = ?, duration_minutes = ?, status = ? WHERE id = ?`;
        const updateMeetingResult = await executeQuery(query, [meetingName, googleMeetLink, membersJson, description, meetingDate, durationMinutes, status, meetingId]);
        if (updateMeetingResult.affectedRows === 0) {
            return res.status(200).json({message: "Failed to update meeting"});
        }

        res.status(200).json({message: "Meeting updated successfully"});
    } catch (error) {
        console.error("Error while updating meeting:" ,error);
        return res.status(400).json(error);
    }
}

// Delete a meeting
export const deleteMeeting = async(req, res) => {
    try {
        const meetingId = req.query.meetingId;
        if (!meetingId){
            return res.status(400).json({message: "Meeting ID is required"});
        }

        var query = `DELETE FROM meetings WHERE id = ?`;
        const deleteMeetingResult = await executeQuery(query, [meetingId]);
        if (deleteMeetingResult.affectedRows === 0) {
            return res.status(200).json({message: "Failed to delete meeting"});
        }
        res.status(200).json({message: "Meeting deleted successfully"});
    } catch (error) {
        console.error("Error while deleting meeting:" ,error);
        return res.status(400).json(error);
    }
}

// Get all meetings
export const getAllMeetings = async(req, res) => {
    try {
        var query = `SELECT * FROM meetings ORDER BY meeting_date DESC`;
        const meetings = await executeQuery(query);
        if( meetings.length === 0){
            return res.status(404).json({message: "No meetings found"});
        }
        res.status(200).json(meetings);
    } catch (error) {
        console.error("Error while fetching all meetings:" ,error);
        return res.status(400).json(error);
    }
}

// Get specific meeting by ID
export const getMeetingById = async(req, res) => {
    try {
        const meetingId = req.query.meetingId;
        if (!meetingId){
            return res.status(400).json({message: "Meeting ID is required"});
        }

        var query = `SELECT * FROM meetings WHERE id = ?`;
        const meeting = await executeQuery(query, [meetingId]);
        if( meeting.length === 0){
            return res.status(404).json({message: "Meeting not found"});
        }
        res.status(200).json(meeting);
    } catch (error) {
        console.error("Error while fetching meeting:" ,error);
        return res.status(400).json(error);
    }
}