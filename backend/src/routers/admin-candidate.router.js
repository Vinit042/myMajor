import express from 'express';
import { getAllCandidates, statsByAssignmentStatus, getCandidateById, candidateHistory, getMatchingScore, assignProcessToCandidate, 
    reassignCandidateToEmployee } from '../controllers/admin-candidate.controller.js';

const router = express.Router();

router.post('/getAllCandidates', getAllCandidates);
router.get('/statsByAssignmentStatus', statsByAssignmentStatus);
router.get('/getCandidateById', getCandidateById);
router.get('/candidateHistory', candidateHistory);
router.get('/getMatchingScore', getMatchingScore);
router.post('/assignProcessToCandidate', assignProcessToCandidate);
router.post('/reassignCandidateToEmployee', reassignCandidateToEmployee);

export default router;