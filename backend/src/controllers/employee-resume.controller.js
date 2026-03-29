import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

//Get currect directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up multer for single resume upload
const resumeStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.resolve(__dirname, '../resumes'); 
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter to allow only specific file types
const uploadResume = multer({ 
    storage: resumeStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "image/jpeg",
            "image/png"
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error("Only PDF, PNG, JPEG, and JPG files are allowed"));
        }
        cb(null, true);
    }
});

// Promise wrapper for multer
const uploadResumePromise = (req, res) => {
    return new Promise((resolve, reject) => {
        uploadResume.single("resume")(req, res, (err) => {
            if (err) reject(err);
            else resolve(req.file);
        });
    });
};

// Controller function to handle resume upload
export const handleResumeUpload = async (req, res) => {
    try {
        const file = await uploadResumePromise(req, res);
        return res.status(200).json({
            message: "Resume uploaded successfully"
        });
    } catch (error) {
        console.error("Error while uploading resume:", error);
        res.status(500).json({ message: "Upload failed" });
    }
}