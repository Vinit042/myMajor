import express from "express";
import { getProfile, updateProfile } from '../controllers/admin-profile.controller.js';

const router = express.Router();

router.get('/getProfile', getProfile);
router.post('/updateProfile', updateProfile);

export default router;