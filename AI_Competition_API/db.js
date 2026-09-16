const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://evaluation_lbn2_user:EtwnipY5jzAAR72hgynmK1b3eower7Qu@dpg-daliabrl550s73bchnlg-a.singapore-postgres.render.com/evaluation_lbn2';

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'evaluation',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

const pgPool = new Pool(poolConfig);

function preparePgQuery(sql, params = []) {
  let paramIndex = 1;
  let convertedSql = sql;
  let finalParams = Array.isArray(params) ? [...params] : [params];
  
  if (convertedSql.includes('IN (?)') || convertedSql.includes('in (?)')) {
    convertedSql = convertedSql.replace(/IN \(\?\)/gi, '= ANY($1)');
    if (finalParams.length === 1 && Array.isArray(finalParams[0])) {
      finalParams = [finalParams[0]];
    }
  } else {
    convertedSql = convertedSql.replace(/\?/g, () => `$${paramIndex++}`);
  }

  return { sql: convertedSql, params: finalParams };
}

async function executeQuery(clientOrPool, sql, params = []) {
  const { sql: finalSql, params: finalParams } = preparePgQuery(sql, params);
  const res = await clientOrPool.query(finalSql, finalParams);
  // Add insertId property to res.rows for MySQL compatibility if returning ID
  const rows = res.rows;
  if (res.command === 'INSERT' && rows.length > 0 && rows[0].id) {
    rows.insertId = rows[0].id;
  }
  return [rows, res];
}

async function initDB() {
  try {
    const client = await pgPool.connect();
    
    // Create tables in PostgreSQL
    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        order_index INT NOT NULL DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS criteria (
        id VARCHAR(50) PRIMARY KEY,
        label VARCHAR(255) NOT NULL,
        description VARCHAR(255),
        max_score INT NOT NULL DEFAULT 10,
        order_index INT NOT NULL DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS evaluations (
        id SERIAL PRIMARY KEY,
        evaluator_name VARCHAR(255) NOT NULL,
        department_name VARCHAR(255) NOT NULL,
        eval_date DATE NOT NULL,
        total_score INT NOT NULL DEFAULT 0,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS evaluation_scores (
        id SERIAL PRIMARY KEY,
        evaluation_id INT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
        criterion_id VARCHAR(50) NOT NULL REFERENCES criteria(id) ON DELETE CASCADE,
        score INT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        emp_id VARCHAR(50) PRIMARY KEY,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(50) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'USER'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value VARCHAR(255) NOT NULL
      );
    `);

    // Seed default settings and admin
    await client.query(`
      INSERT INTO settings (setting_key, setting_value)
      VALUES ('authMode', 'LIST')
      ON CONFLICT (setting_key) DO NOTHING;
    `);

    await client.query(`
      INSERT INTO users (emp_id, password, name, role)
      VALUES ('admin', 'admin', '관리자', 'ADMIN')
      ON CONFLICT (emp_id) DO NOTHING;
    `);

    console.log('PostgreSQL tables checked/created.');
    client.release();
  } catch (error) {
    console.error('PostgreSQL Initialization failed:', error);
  }
}

// Wrapper pool matching mysql2 API format for server.js compatibility
const poolWrapper = {
  query: (sql, params) => executeQuery(pgPool, sql, params),
  
  getConnection: async () => {
    const client = await pgPool.connect();
    return {
      query: (sql, params) => executeQuery(client, sql, params),
      beginTransaction: () => client.query('BEGIN'),
      commit: () => client.query('COMMIT'),
      rollback: () => client.query('ROLLBACK'),
      release: () => client.release()
    };
  }
};

module.exports = {
  initDB,
  pool: poolWrapper
};
