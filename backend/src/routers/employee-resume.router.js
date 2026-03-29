import express from 'express';
import {handleResumeUpload} from '../controllers/employee-resume.controller.js';

const router = express.Router();

router.post('/handleResumeUpload', handleResumeUpload);

export default router;