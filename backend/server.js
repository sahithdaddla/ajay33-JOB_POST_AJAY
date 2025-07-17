require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors'); // Add CORS support
const app = express();
const port = process.env.PORT || 3102;

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'new_employee_db',
  password: process.env.DB_PASSWORD || 'admin123',
  port: process.env.DB_PORT || 5432,
});

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    "http://51.20.3.185:8340",
    "http://127.0.0.1:5500",
    "http://51.20.3.185:8341",
   
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Create jobs table if not exists
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        job_title VARCHAR(100) NOT NULL,
        job_description TEXT NOT NULL,
        skill_set TEXT[] NOT NULL,
        experience NUMERIC(3,1) NOT NULL,
        job_type VARCHAR(20) NOT NULL,
        location VARCHAR(100) NOT NULL,
        salary VARCHAR(50) NOT NULL,
        deadline DATE NOT NULL,
        posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database initialized');
  } catch (err) {
    console.error('Database initialization failed:', err);
    process.exit(1);
  }
}

// Initialize the database
initializeDatabase();

// API Routes

// Handle form submission
app.post('/api/jobs', async (req, res) => {
  try {
    const { jobTitle, jobDescription, skillSet, experience, jobType, location, salary, deadline } = req.body;
    
    // Convert skills string to array (if not already array)
    const skillsArray = Array.isArray(skillSet) ? skillSet : skillSet.split(',').map(skill => skill.trim());
    
    const result = await pool.query(
      `INSERT INTO jobs (
        job_title, job_description, skill_set, experience,
        job_type, location, salary, deadline
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [jobTitle, jobDescription, skillsArray, experience, 
       jobType, location, salary, deadline]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error posting job:', err);
    res.status(500).json({ error: 'Failed to post job', details: err.message });
  }
});

// Get all jobs (for listings page)
app.get('/api/jobs', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const jobsQuery = await pool.query(
      `SELECT * FROM jobs 
       ORDER BY posted_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    const countQuery = await pool.query('SELECT COUNT(*) FROM jobs');
    
    res.json({
      jobs: jobsQuery.rows,
      total: parseInt(countQuery.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(countQuery.rows[0].count / limit)
    });
  } catch (err) {
    console.error('Error fetching jobs:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get single job (for detailed view)
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM jobs WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching job:', err);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// Serve HTML pages
app.get('/post-job', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'post-job.html'));
});

app.get('/jobs/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'job-detail.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://51.20.3.185:${port}`);
});