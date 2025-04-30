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