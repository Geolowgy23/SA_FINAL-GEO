// backend/server.js
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL connection (XAMPP)
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',     // XAMPP default
  password: '',     // set if you added one
  database: 'reserveit_db',
});

// Check connection
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ MySQL connection error:', err);
  } else {
    console.log('✅ Connected to MySQL (XAMPP)');
    connection.release();
  }
});

// ================= AUTH ROUTES =================

// Register user (plain text password for demo/school only)
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const checkSql = 'SELECT id FROM users WHERE username = ? LIMIT 1';
  db.query(checkSql, [username], (err, rows) => {
    if (err) {
      console.error('Error checking user:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (rows.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const insertSql = 'INSERT INTO users (username, password) VALUES (?, ?)';
    db.query(insertSql, [username, password], (err, result) => {
      if (err) {
        console.error('Error inserting user:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const user = {
        id: result.insertId,
        username,
      };
      res.status(201).json(user);
    });
  });
});

// Login user
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const sql =
    'SELECT id, username, password FROM users WHERE username = ? LIMIT 1';

  db.query(sql, [username], (err, rows) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];

    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.json({ id: user.id, username: user.username });
  });
});

// ================= HEALTH CHECK =================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ReserveIT backend is running' });
});

// ================= RESERVATIONS =================

// Get all reservations (now includes username)
app.get('/api/reservations', (req, res) => {
  const sql = `
    SELECT id,
           room_name  AS roomName,
           date,
           start_time AS startTime,
           end_time   AS endTime,
           purpose,
           username,
           created_at
    FROM reservations
    ORDER BY date DESC, start_time DESC;
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error('Error fetching reservations:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Save new reservation (with username)
app.post('/api/reservations', (req, res) => {
  const { roomName, date, startTime, endTime, purpose, username } = req.body;

  if (!roomName || !date || !startTime || !endTime || !purpose || !username) {
    return res
      .status(400)
      .json({ error: 'Missing fields (including username)' });
  }

  const sql = `
    INSERT INTO reservations (room_name, date, start_time, end_time, purpose, username)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [roomName, date, startTime, endTime, purpose, username],
    (err, result) => {
      if (err) {
        console.error('Error inserting reservation:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const saved = {
        id: result.insertId,
        roomName,
        date,
        startTime,
        endTime,
        purpose,
        username,
      };

      res.status(201).json(saved);
    }
  );
});

// 🔄 UPDATE existing reservation (edit booked room)
// Only the original username can edit their own reservation
app.put('/api/reservations/:id', (req, res) => {
  const { id } = req.params;
  const { roomName, date, startTime, endTime, purpose, username } = req.body;

  if (!roomName || !date || !startTime || !endTime || !purpose || !username) {
    return res
      .status(400)
      .json({ error: 'Missing fields (including username)' });
  }

  // We DO NOT change the username column.
  const sql = `
    UPDATE reservations
    SET room_name = ?, date = ?, start_time = ?, end_time = ?, purpose = ?
    WHERE id = ? AND username = ?
  `;

  db.query(
    sql,
    [roomName, date, startTime, endTime, purpose, id, username],
    (err, result) => {
      if (err) {
        console.error('Error updating reservation:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (result.affectedRows === 0) {
        // either reservation not found OR username mismatch
        return res
          .status(403)
          .json({ error: 'Not allowed to edit this reservation' });
      }

      const updated = {
        id: Number(id),
        roomName,
        date,
        startTime,
        endTime,
        purpose,
        username,
      };

      res.json(updated);
    }
  );
});

// ❌ DELETE existing reservation (owner only)
app.delete('/api/reservations/:id', (req, res) => {
  const { id } = req.params;
  const { username } = req.body; // we expect username in JSON body

  if (!username) {
    return res
      .status(400)
      .json({ error: 'Username is required to delete a reservation' });
  }

  const sql = `
    DELETE FROM reservations
    WHERE id = ? AND username = ?
  `;

  db.query(sql, [id, username], (err, result) => {
    if (err) {
      console.error('Error deleting reservation:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.affectedRows === 0) {
      // either reservation not found OR username mismatch
      return res
        .status(403)
        .json({ error: 'Not allowed to delete this reservation' });
    }

    res.json({ success: true, id: Number(id) });
  });
});

// ================= START SERVER =================

app.listen(PORT, () => {
  console.log(`🚀 ReserveIT backend running on http://localhost:${PORT}`);
});
