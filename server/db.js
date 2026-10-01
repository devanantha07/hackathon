const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'campus.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrency and integrity
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function initDb() {
  // Create tables if they do not exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS places (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      building TEXT NOT NULL,
      floor TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'Available',
      route_directions TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      event_date TEXT NOT NULL,
      event_time TEXT NOT NULL,
      description TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS event_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(event_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      block TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      photo_url TEXT,
      status TEXT NOT NULL DEFAULT 'Reported',
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS issue_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(issue_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS lost_found (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT NOT NULL,
      photo_url TEXT,
      contact_info TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open',
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS canteen_menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Snacks',
      price REAL NOT NULL,
      available INTEGER NOT NULL DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS canteen_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      level TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bus_routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_number TEXT NOT NULL,
      destination TEXT NOT NULL,
      pickup_point TEXT NOT NULL,
      timings TEXT NOT NULL,
      active_days TEXT NOT NULL DEFAULT 'Mon-Sat'
    );

    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      number TEXT NOT NULL,
      location TEXT,
      available_hours TEXT DEFAULT '24x7'
    );
  `);

  // Check if DB needs seed data
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    console.log('Database is empty. Running initial seed...');
    const { seed } = require('./seed');
    seed(db);
    console.log('Initial seed completed successfully.');
  }
}

module.exports = {
  db,
  initDb
};
