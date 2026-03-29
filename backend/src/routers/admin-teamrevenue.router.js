import express from 'express';
import { getTeamRevenue } from '../controllers/admin-teamrevenue.controller.js';

const router = express.Router();
router.post('/getTeamRevenue', getTeamRevenue);

export default router;