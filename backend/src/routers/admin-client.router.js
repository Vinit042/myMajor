import express from "express";
import {getAllClients, getClientDetails, getAllEmployeesForAssignment, assignedEmployees, assignNewEmployee, removeAssignedEmployee, 
        processesOfClient, addClient, updateClient, deletedClient } from "../controllers/admin-client.controller.js";

const router = express.Router();
router.get("/getAllClients", getAllClients);
router.get("/getClientDetails", getClientDetails);
router.get("/getAllEmployeesForAssignment", getAllEmployeesForAssignment)
router.get("/assignedEmployees", assignedEmployees);
router.post("/assignNewEmployee", assignNewEmployee);
router.delete("/removeAssignedEmployee", removeAssignedEmployee);
router.get("/processesOfClient", processesOfClient);
router.post("/addClient", addClient);
router.post("/updateClient", updateClient);
router.put("/updateClient", updateClient);
router.delete("/deletedClient", deletedClient);

export default router;