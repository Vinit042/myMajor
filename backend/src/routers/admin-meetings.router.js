import express from "express";
import {addNewMeeting, updateMeeting, deleteMeeting, getAllMeetings, getMeetingById } from '../controllers/admin-meetings.controller.js';

const router = express.Router();
router.post('/addNewMeeting', addNewMeeting);
router.post('/updateMeeting', updateMeeting);
router.delete('/deleteMeeting', deleteMeeting);
router.get('/getAllMeetings', getAllMeetings);
router.get('/getMeetingById', getMeetingById);

export default router;