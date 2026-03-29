import express from "express";
import { dashboardStatistics, getTopPerformers } from "../controllers/admin-dashboard.controller.js";

const router = express.Router();

router.get('/dashboardStatistics', dashboardStatistics);
router.post('/getTopPerformers', getTopPerformers);

export default router;