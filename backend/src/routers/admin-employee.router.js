import express from 'express';
import { uploadEmployeeDocs, addEmployee, getEmployeeById, getAllEmployees, updateEmployee, deleteEmployee, markAsPIP, getEmployeePortfolio, 
    addLOP, endPIP
 } from '../controllers/admin-employee.controller.js';

const router = express.Router();

router.post('/addEmployee',uploadEmployeeDocs, addEmployee);
router.get('/getEmployeeById', getEmployeeById);
router.get('/getAllEmployees', getAllEmployees);
router.put('/updateEmployee', uploadEmployeeDocs, updateEmployee);
router.delete('/deleteEmployee', deleteEmployee);
router.post('/markAsPIP', markAsPIP);
router.post('/endPIP', endPIP);
router.post('/addLOP', addLOP);
router.post('/getEmployeePortfolio', getEmployeePortfolio);

export default router;