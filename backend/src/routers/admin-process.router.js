import express from "express";
import { getAllProcesses, addProcess, viewProcessDetails, getProcessSpocs, calculateKeywords, addKeywordsManually,
    getKeywords, updateProcess, deleteProcess } from '../controllers/admin-process.controller.js';

const router = express.Router();
router.get('/getAllProcesses', getAllProcesses);
router.post('/addProcess', addProcess);
router.get('/viewProcessDetails', viewProcessDetails);
router.get('/getProcessSpocs', getProcessSpocs);
router.post('/updateProcess', updateProcess);
router.delete('/deleteProcess', deleteProcess);

export default router;