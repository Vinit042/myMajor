import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser"; 
import cors from "cors";
import authRouters from "./routers/auth.router.js";
import admin_employeeRouters from "./routers/admin-employee.router.js";
import admin_dashboardRouters from "./routers/admin-dashboard.router.js";
import admin_profileRouter from "./routers/admin-profile.router.js";
import admin_clientRouter from "./routers/admin-client.router.js";
import admin_processRouter from "./routers/admin-process.router.js";
import admin_teamRouter from "./routers/admin-team.router.js";
import admin_candidateRouter from "./routers/admin-candidate.router.js";
import admin_meetingsRouter from "./routers/admin-meetings.router.js";
import admin_teamrevenueRouter from "./routers/admin-teamrevenue.router.js";
import employee_dashboardRouter from "./routers/employee-dashboard.router.js";
import employeeResumeRouter from "./routers/employee-resume.router.js";

dotenv.config();

const app = express();

app.use(cors({
    origin: "https://red-rook-928140.hostingersite.com",
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRouters);
app.use("/api/admin/employee", admin_employeeRouters);
app.use("/api/admin/dashboard", admin_dashboardRouters);
app.use("/api/admin/profile", admin_profileRouter);
app.use("/api/admin/client", admin_clientRouter);
app.use("/api/admin/process", admin_processRouter);
app.use("/api/admin/team", admin_teamRouter);
app.use("/api/admin/candidate", admin_candidateRouter);
app.use("/api/admin/meetings", admin_meetingsRouter);
app.use("/api/admin/teamrevenue", admin_teamrevenueRouter);
app.use("/api/employee/dashboard", employee_dashboardRouter);
app.use('/api/employee/resume', employeeResumeRouter);

app.listen(process.env.PORT, () => {
    console.log("server is running at port: "+process.env.PORT);
});