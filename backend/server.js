require('dotenv').config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const { Client } = require("pg");
const cors = require("cors");
const fs = require("fs");
const mime = require('mime-types');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup CORS
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    "http://3.84.202.40:8084",
    "http://3.84.202.40:8083"
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload setup
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Database setup
const client = new Client({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'ajay_db',
  password: process.env.DB_PASSWORD || 'admin123',
  port: process.env.DB_PORT || 5432,
});

// Connect to DB
const connectToDatabase = async () => {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL");
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
        emp_bank_branch VARCHAR(100),  -- Added bank branch location
        emp_job_role VARCHAR(255),
        emp_department VARCHAR(255),
        emp_experience_status VARCHAR(20),
        emp_company_name VARCHAR(255),
        emp_years_of_experience INTEGER,
        emp_joining_date DATE,
        emp_profile_pic VARCHAR(255),  -- Added profile picture
        emp_salary_slip VARCHAR(255),
        emp_offer_letter VARCHAR(255),  -- Added offer letter
        emp_relieving_letter VARCHAR(255),  -- Added relieving letter
        emp_experience_certificate VARCHAR(255),  -- Added experience certificate
        emp_ssc_doc VARCHAR(255),
        ssc_school VARCHAR(255),
        ssc_year INTEGER,
        ssc_grade VARCHAR(20),
        emp_inter_doc VARCHAR(255),
        inter_college VARCHAR(255),
        inter_year INTEGER,
        inter_grade VARCHAR(20),
        inter_branch VARCHAR(100),
        emp_grad_doc VARCHAR(255),
        grad_college VARCHAR(255),
        grad_year INTEGER,
        grad_grade VARCHAR(20),
        grad_degree VARCHAR(100),
        grad_branch VARCHAR(100),
        resume VARCHAR(255),
        id_proof VARCHAR(255),
        signed_document VARCHAR(255),
        emp_terms_accepted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Verified table exists");
  } catch (err) {
    console.error("DB connection error:", err);
    setTimeout(connectToDatabase, 5000);
  }
};
connectToDatabase();

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    allowedTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type'));
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Helper to clean up failed uploads
const cleanupFiles = (files) => {
  if (!files) return;
  Object.values(files).forEach(fileArray => {
    fileArray.forEach(file => {
      try {
        const filePath = path.join(uploadDir, file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (err) {
        console.error("File cleanup error:", err);
      }
    });
  });
};

// Save employee with file uploads
app.post("/save-employee", upload.fields([
  { name: "emp_profile_pic", maxCount: 1 },  // Added profile picture
  { name: "emp_salary_slip", maxCount: 1 },
  { name: "emp_offer_letter", maxCount: 1 },  // Added offer letter
  { name: "emp_relieving_letter", maxCount: 1 },  // Added relieving letter
  { name: "emp_experience_certificate", maxCount: 1 },  // Added experience certificate
  { name: "emp_ssc_doc", maxCount: 1 },
  { name: "emp_inter_doc", maxCount: 1 },
  { name: "emp_grad_doc", maxCount: 1 },
  { name: "resume", maxCount: 1 },
  { name: "id_proof", maxCount: 1 },
  { name: "signed_document", maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.body.emp_name || !req.body.emp_email) {
      cleanupFiles(req.files);
      return res.status(400).json({ error: "Name and email are required" });
    }

    // Validate profile picture
    if (!req.files["emp_profile_pic"]) {
      cleanupFiles(req.files);
      return res.status(400).json({ error: "Profile picture is required" });
    }

    // Validate salary slip, offer letter, relieving letter, and experience certificate for experienced candidates
    if (req.body.emp_experience_status === 'Experienced') {
      if (!req.files["emp_salary_slip"]) {
        cleanupFiles(req.files);
        return res.status(400).json({ error: "Salary slip is required for experienced candidates" });
      }
      if (!req.files["emp_offer_letter"]) {
        cleanupFiles(req.files);
        return res.status(400).json({ error: "Offer letter is required for experienced candidates" });
      }
      if (!req.files["emp_relieving_letter"]) {
        cleanupFiles(req.files);
        return res.status(400).json({ error: "Relieving letter is required for experienced candidates" });
      }
      if (!req.files["emp_experience_certificate"]) {
        cleanupFiles(req.files);
        return res.status(400).json({ error: "Experience certificate is required for experienced candidates" });
      }
    }

    const result = await client.query(`
      INSERT INTO ajay_table (
        emp_name, emp_email, emp_dob, emp_mobile, emp_address, emp_city,
        emp_state, emp_zipcode, emp_bank, emp_account, emp_ifsc, emp_bank_branch,
        emp_job_role, emp_department, emp_experience_status, emp_company_name, 
        emp_years_of_experience, emp_joining_date, emp_profile_pic, emp_salary_slip,
        emp_offer_letter, emp_relieving_letter, emp_experience_certificate,
        emp_ssc_doc, ssc_school, ssc_year, ssc_grade, emp_inter_doc, inter_college,
        inter_year, inter_grade, inter_branch, emp_grad_doc, grad_college, grad_year,
        grad_grade, grad_degree, grad_branch, resume, id_proof, signed_document, 
        emp_terms_accepted
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43
      )
      RETURNING id
    `, [
      req.body.emp_name,
      req.body.emp_email,
      req.body.emp_dob,
      req.body.emp_mobile,
      req.body.emp_address,
      req.body.emp_city,
      req.body.emp_state,
      req.body.emp_zipcode,
      req.body.emp_bank,
      req.body.emp_account,
      req.body.emp_ifsc,
      req.body.emp_bank_branch,  // Added bank branch location
      req.body.emp_job_role,
      req.body.emp_department,
      req.body.emp_experience_status,
      req.body.emp_company_name || null,
      req.body.emp_years_of_experience ? parseInt(req.body.emp_years_of_experience) : null,
      req.body.emp_joining_date,
      req.files["emp_profile_pic"]?.[0]?.filename || null,  // Added profile picture
      req.files["emp_salary_slip"]?.[0]?.filename || null,
      req.files["emp_offer_letter"]?.[0]?.filename || null,  // Added offer letter
      req.files["emp_relieving_letter"]?.[0]?.filename || null,  // Added relieving letter
      req.files["emp_experience_certificate"]?.[0]?.filename || null,  // Added experience certificate
      req.files["emp_ssc_doc"]?.[0]?.filename || null,
      req.body.ssc_school,
      req.body.ssc_year ? parseInt(req.body.ssc_year) : null,
      req.body.ssc_grade,
      req.files["emp_inter_doc"]?.[0]?.filename || null,
      req.body.inter_college,
      req.body.inter_year ? parseInt(req.body.inter_year) : null,
      req.body.inter_grade,
      req.body.inter_branch,
      req.files["emp_grad_doc"]?.[0]?.filename || null,
      req.body.grad_college,
      req.body.grad_year ? parseInt(req.body.grad_year) : null,
      req.body.grad_grade,
      req.body.grad_degree,
      req.body.grad_branch,
      req.files["resume"]?.[0]?.filename || null,
      req.files["id_proof"]?.[0]?.filename || null,
      req.files["signed_document"]?.[0]?.filename || null,
      req.body.emp_terms_accepted === 'true'
    ]);

    res.status(201).json({
      success: true,
      employeeId: result.rows[0].id
    });

  } catch (err) {
    cleanupFiles(req.files);
    console.error("Save employee error:", err);
    res.status(500).json({
      error: "Database error",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Get all employees with document URLs
app.get("/employees", async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM ajay_table ORDER BY created_at DESC");
    const employees = result.rows.map(emp => {
      const employeeData = { ...emp };
      
      // Generate URLs for all document fields
      const documentFields = [
        'emp_profile_pic', 'emp_salary_slip', 'emp_offer_letter',
        'emp_relieving_letter', 'emp_experience_certificate', 'emp_ssc_doc', 
        'emp_inter_doc', 'emp_grad_doc', 'resume', 
        'id_proof', 'signed_document'
      ];
      
      documentFields.forEach(field => {
        if (employeeData[field]) {
          employeeData[`${field}_url`] = `${req.protocol}://${req.get('host')}/uploads/${employeeData[field]}`;
        }
      });
      
      return employeeData;
    });

    res.json(employees);
  } catch (error) {
    console.error("Fetch employees error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Get single employee by ID with full details
app.get("/employees/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await client.query("SELECT * FROM ajay_table WHERE id = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const employee = result.rows[0];
    const employeeData = { ...employee };
    
    // Generate URLs for all document fields
    const documentFields = [
      'emp_profile_pic', 'emp_salary_slip', 'emp_offer_letter',
      'emp_relieving_letter', 'emp_experience_certificate', 'emp_ssc_doc', 
      'emp_inter_doc', 'emp_grad_doc', 'resume', 
      'id_proof', 'signed_document'
    ];
    
    documentFields.forEach(field => {
      if (employeeData[field]) {
        employeeData[`${field}_url`] = `${req.protocol}://${req.get('host')}/uploads/${employeeData[field]}`;
      }
    });

    res.json(employeeData);
  } catch (error) {
    console.error("Fetch employee error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Get document URLs for an employee
app.post("/get-documents", async (req, res) => {
  try {
    const { empEmail } = req.body;
    if (!empEmail) {
      return res.status(400).json({ error: "Employee email is required" });
    }

    const result = await client.query(
      "SELECT * FROM ajay_table WHERE emp_email = $1",
      [empEmail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const employee = result.rows[0];
    const documents = {};

    const docFields = [
      { field: 'emp_profile_pic', name: 'Profile Picture' },
      { field: 'emp_salary_slip', name: 'Salary Slip' },
      { field: 'emp_offer_letter', name: 'Offer Letter' },
      { field: 'emp_relieving_letter', name: 'Relieving Letter' },
      { field: 'emp_experience_certificate', name: 'Experience Certificate' },
      { field: 'emp_ssc_doc', name: 'SSC Document' },
      { field: 'emp_inter_doc', name: 'Intermediate Document' },
      { field: 'emp_grad_doc', name: 'Graduation Document' },
      { field: 'resume', name: 'Resume' },
      { field: 'id_proof', name: 'ID Proof' },
      { field: 'signed_document', name: 'Signed Document' }
    ];

    docFields.forEach(({field, name}) => {
      if (employee[field]) {
        const filePath = path.join(uploadDir, employee[field]);
        if (fs.existsSync(filePath)) {
          documents[field] = {
            url: `${req.protocol}://${req.get('host')}/uploads/${employee[field]}`,
            name: name,
            filename: employee[field]
          };
        }
      }
    });

    res.json({ documents });

  } catch (error) {
    console.error("Get documents error:", error);
    res.status(500).json({ error: "Server error while fetching documents" });
  }
});

// Download single document
app.get("/download/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename) {
      return res.status(400).json({ error: "Filename is required" });
    }

    const filePath = path.join(uploadDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Server error during download" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
