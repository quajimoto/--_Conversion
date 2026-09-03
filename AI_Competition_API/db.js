const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'evaluation',
  password: 'Tlsgmd1@#$',
  port: 3306,
  multipleStatements: true
};

async function initDB() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // 2. Switch to the database
    await connection.query('USE evaluation');
    
    // 3. Create tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        order_index INT NOT NULL DEFAULT 0
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS criteria (
        id VARCHAR(50) PRIMARY KEY,
        label VARCHAR(255) NOT NULL,
        description VARCHAR(255),
        max_score INT NOT NULL DEFAULT 10,
        order_index INT NOT NULL DEFAULT 0
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS evaluations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        evaluator_name VARCHAR(255) NOT NULL,
        department_name VARCHAR(255) NOT NULL,
        eval_date DATE NOT NULL,
        total_score INT NOT NULL DEFAULT 0,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS evaluation_scores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        evaluation_id INT NOT NULL,
        criterion_id VARCHAR(50) NOT NULL,
        score INT NOT NULL,
        FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE,
        FOREIGN KEY (criterion_id) REFERENCES criteria(id) ON DELETE CASCADE
      )
    `);

    // 4. Create Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        emp_id VARCHAR(50) PRIMARY KEY,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(50) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'USER'
      )
    `);

    // Create Settings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value VARCHAR(255) NOT NULL
      )
    `);
    await connection.query(`
      INSERT IGNORE INTO settings (setting_key, setting_value) VALUES ('authMode', 'LIST')
    `);

    // 5. Seed default admin if table is empty
    const [userRows] = await connection.query('SELECT emp_id FROM users WHERE emp_id = "admin"');
    if (userRows.length === 0) {
      await connection.query(`
        INSERT INTO users (emp_id, password, name, role) 
        VALUES ('admin', 'admin', '관리자', 'ADMIN')
      `);
      console.log('Default admin user created.');
    }
    
    console.log('All tables checked/created.');
    await connection.end();
  } catch (error) {
    console.error('DB Initialization failed:', error);
  }
}

// Create connection pool for app
const pool = mysql.createPool({
  ...dbConfig,
  database: 'evaluation',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = {
  initDB,
  pool
};
