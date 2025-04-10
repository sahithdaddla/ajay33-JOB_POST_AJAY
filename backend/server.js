require('dotenv').config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const { Pool, Client } = require("pg");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Setup CORS to allow cross-origin requests from the frontend
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,   // Allow URL from .env file
    "http://3.90.173.100:8084",
    "http://3.90.173.100:8083"
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true  // Allow cookies to be sent with the request
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// PostgreSQL client setup for the backend server
const client = new Client({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'ajay_db',
  password: process.env.DB_PASSWORD || 'admin123',
  port: process.env.DB_PORT || 5432,
});

// PostgreSQL pool setup for the frontend server
const pool = new Pool({
  user: "postgres",
  host: "postgres",
  database: "ajay_db",
  password: "admin123",
  port: 5432,
});

// Connect to PostgreSQL for the backend API
const connectToDatabase = async () => {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL database");
    await client.query(`
      CREATE TABLE IF NOT EXISTS ajay_table (
        id SERIAL PRIMARY KEY,
        emp_name VARCHAR(255) NOT NULL,
        emp_email VARCHAR(255) UNIQUE NOT NULL,
        emp_dob DATE,
        emp_mobile VARCHAR(20),
        emp_address TEXT,
        emp_city VARCHAR(100),
        emp_state VARCHAR(100),
        emp_zipcode VARCHAR(20),
        emp_bank VARCHAR(255),
        emp_account VARCHAR(50),
        emp_ifsc VARCHAR(20),
        emp_job_role VARCHAR(255),
        emp_department VARCHAR(255),
        emp_experience_status BOOLEAN,
        emp_company_name VARCHAR(255),
        emp_years_of_experience INTEGER,
        emp_joining_date DATE,
        emp_experience_doc VARCHAR(255),
        emp_ssc_doc VARCHAR(255),
        emp_inter_doc VARCHAR(255),
        emp_grad_doc VARCHAR(255),
        emp_terms_accepted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Verified ajay_table table exists");
  } catch (err) {
    console.error("Database connection error:", err.message);
    setTimeout(connectToDatabase, 5000);
  }
};
connectToDatabase();

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, and PNG files are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }  // 5 MB limit
});

// Backend API: Save Employee Data (POST)
app.post("/save-employee", upload.fields([
  { name: "emp_experience_doc", maxCount: 1 },
  { name: "emp_ssc_doc", maxCount: 1 },
  { name: "emp_inter_doc", maxCount: 1 },
  { name: "emp_grad_doc", maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.body.emp_name || !req.body.emp_email) {
      return res.status(400).json({
        success: false,
        error: "Name and email are required fields"
      });
    }

    const {
      emp_name, emp_email, emp_dob, emp_mobile, emp_address, emp_city,
      emp_state, emp_zipcode, emp_bank, emp_account, emp_ifsc, emp_job_role,
      emp_department, emp_experience_status, emp_company_name, emp_years_of_experience,
      emp_joining_date, emp_terms_accepted
    } = req.body;

    const sql = `
      INSERT INTO ajay_table
      (emp_name, emp_email, emp_dob, emp_mobile, emp_address, emp_city, emp_state, 
      emp_zipcode, emp_bank, emp_account, emp_ifsc, emp_job_role, emp_department, 
      emp_experience_status, emp_company_name, emp_years_of_experience, emp_joining_date, 
      emp_experience_doc, emp_ssc_doc, emp_inter_doc, emp_grad_doc, emp_terms_accepted) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING id
    `;

    const values = [
      emp_name, 
      emp_email, 
      emp_dob, 
      emp_mobile, 
      emp_address, 
      emp_city,
      emp_state, 
      emp_zipcode, 
      emp_bank, 
      emp_account, 
      emp_ifsc, 
      emp_job_role,
      emp_department, 
      emp_experience_status === 'true', 
      emp_company_name || null,
      emp_years_of_experience ? parseInt(emp_years_of_experience) : null, 
      emp_joining_date,
      req.files["emp_experience_doc"]?.[0]?.filename || null,
      req.files["emp_ssc_doc"]?.[0]?.filename || null,
      req.files["emp_inter_doc"]?.[0]?.filename || null,
      req.files["emp_grad_doc"]?.[0]?.filename || null,
      emp_terms_accepted === 'true'
    ];

    const result = await client.query(sql, values);

    res.status(201).json({ 
      success: true,
      message: "Employee added successfully",
      employeeId: result.rows[0].id,
      employee: {
        id: result.rows[0].id,
        emp_name,
        emp_email
      }
    });

  } catch (err) {
    console.error("Error in /save-employee:", err);

    if (req.files) {
      Object.values(req.files).forEach(fileArray => {
        fileArray.forEach(file => {
          try {
            fs.unlinkSync(path.join(uploadDir, file.filename));
          } catch (unlinkErr) {
            console.error("Error deleting file:", unlinkErr);
          }
        });
      });
    }

    res.status(500).json({ 
      success: false,
      error: "Database error",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Frontend API: Fetch Employee Data (GET)
app.get("/employees", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM ajay_table");  
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Health Check Route
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK",
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
