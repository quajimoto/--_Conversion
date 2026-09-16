const express = require('express');
const cors = require('cors');
const { initDB, pool } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// DB 초기화 및 테이블 생성
initDB();

// Login API
app.post('/api/login', async (req, res) => {
  const { empId, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT name, role FROM users WHERE emp_id = ? AND password = ?', [empId, password]);
    if (rows.length > 0) {
      res.json({ success: true, user: rows[0] });
    } else {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  }
});

// Settings API
app.get('/api/settings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  }
});

app.post('/api/settings', async (req, res) => {
  const settings = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const [key, value] of Object.entries(settings)) {
      await connection.query(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value',
        [key, String(value)]
      );
    }
    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('Settings save error:', error);
    res.status(500).json({ error: 'DB Error' });
  } finally {
    connection.release();
  }
});

// Departments API
app.get('/api/departments', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT name FROM departments ORDER BY order_index ASC');
    const departments = rows.map(r => r.name);
    res.json(departments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  }
});

app.post('/api/departments/sync', async (req, res) => {
  const { departments } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM departments'); // Clear existing
    if (departments && departments.length > 0) {
      for (let i = 0; i < departments.length; i++) {
        await connection.query('INSERT INTO departments (name, order_index) VALUES (?, ?)', [departments[i], i]);
      }
    }
    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  } finally {
    connection.release();
  }
});

// Criteria API
app.get('/api/criteria', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM criteria ORDER BY order_index ASC');
    // Map max_score to maxScore for frontend compatibility
    const formatted = rows.map(r => ({
      id: r.id,
      label: r.label,
      description: r.description,
      maxScore: r.max_score
    }));
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  }
});

app.post('/api/criteria/sync', async (req, res) => {
  const { criteria } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM criteria'); // Clear existing
    if (criteria && criteria.length > 0) {
      for (let i = 0; i < criteria.length; i++) {
        const c = criteria[i];
        await connection.query(
          'INSERT INTO criteria (id, label, description, max_score, order_index) VALUES (?, ?, ?, ?, ?)', 
          [c.id, c.label, c.description || '', c.maxScore || 10, i]
        );
      }
    }
    await connection.commit();
    res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  } finally {
    connection.release();
  }
});

// Evaluation Submission
app.post('/api/evaluation/submit', async (req, res) => {
  const { evaluator_name, department_name, eval_date, total_score, scores } = req.body;
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Delete existing evaluation for this user, dept, and date (for modify feature)
    await connection.query(`
      DELETE FROM evaluations
      WHERE evaluator_name = ? AND department_name = ? AND eval_date = ?
    `, [evaluator_name || '익명', department_name, eval_date]);

    // Insert into evaluations master
    const [evalResult] = await connection.query(`
      INSERT INTO evaluations (evaluator_name, department_name, eval_date, total_score)
      VALUES (?, ?, ?, ?) RETURNING id
    `, [evaluator_name || '익명', department_name, eval_date, total_score || 0]);

    const evalId = evalResult[0]?.id || evalResult.insertId;

    // Insert detailed scores
    if (scores) {
      for (const [criterion_id, score] of Object.entries(scores)) {
        if (score !== '') {
          await connection.query(`
            INSERT INTO evaluation_scores (evaluation_id, criterion_id, score)
            VALUES (?, ?, ?)
          `, [evalId, criterion_id, Number(score)]);
        }
      }
    }
    
    await connection.commit();
    res.json({ success: true, evalId });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  } finally {
    connection.release();
  }
});

// Admin Results
app.get('/api/admin/results', async (req, res) => {
  const dept = req.query.department;
  const date = req.query.date; // optional
  
  try {
    let query = 'SELECT * FROM evaluations WHERE is_deleted = FALSE';
    let params = [];

    if (dept && dept !== '전체') {
      query += ' AND department_name = ?';
      params.push(dept);
    }

    query += ' ORDER BY created_at DESC';
    
    const [evals] = await pool.query(query, params);
    
    const results = [];
    
    // Compute averages
    const averages = {};
    let totalEvals = evals.length;
    let sumTotal = 0;
    
    for (const e of evals) {
      sumTotal += e.total_score;
      
      const [scoresRows] = await pool.query('SELECT * FROM evaluation_scores WHERE evaluation_id = ?', [e.id]);
      
      const scoreMap = {};
      for (const sr of scoresRows) {
        scoreMap[sr.criterion_id] = sr.score;
        averages[sr.criterion_id] = (averages[sr.criterion_id] || 0) + sr.score;
      }
      
      results.push({
        id: e.id,
        name: e.evaluator_name,
        date: e.eval_date,
        total: e.total_score,
        isDeleted: !!e.is_deleted,
        department_name: e.department_name,
        ...scoreMap
      });
    }
    
    if (totalEvals > 0) {
      for (const key in averages) {
        averages[key] = (averages[key] / totalEvals).toFixed(1);
      }
      averages.total = (sumTotal / totalEvals).toFixed(1);
    } else {
      averages.total = 0;
    }
    
    res.json({
      department: dept,
      results,
      averages
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  }
});

// Admin Soft Delete
app.post('/api/admin/results/delete', async (req, res) => {
  const { ids } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ error: 'No ids provided' });
  
  try {
    await pool.query('UPDATE evaluations SET is_deleted = TRUE WHERE id IN (?)', [ids]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DB Error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
