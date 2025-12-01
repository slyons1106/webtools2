import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcrypt';

const DATABASE_FILE = './database.sqlite';
const SALT_ROUNDS = 10;

export async function initializeDatabase() {
  console.log(`Initializing database at: ${DATABASE_FILE}`); // Log the database file path
  const db = await open({
    filename: DATABASE_FILE,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      allowedPages TEXT DEFAULT '[]'
    );
  `);

  // Seed default admin user if not exists
  const existingAdmin = await db.get("SELECT * FROM users WHERE username = 'admin'");
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('adminpassword', SALT_ROUNDS);
    await db.run(
      "INSERT INTO users (username, password, role, allowedPages) VALUES (?, ?, ?, ?)",
      'admin',
      hashedPassword,
      'ADMIN',
      JSON.stringify(['/page1', '/page2', '/page3', '/page4', '/page5', '/page6', '/admin', '/home']) // Admin has access to all pages
    );
    console.log('Default admin user created.');
  }

  // Seed default user if not exists
  const existingUser = await db.get("SELECT * FROM users WHERE username = 'user'");
  if (!existingUser) {
    const hashedPassword = await bcrypt.hash('password', SALT_ROUNDS);
    await db.run(
      "INSERT INTO users (username, password, role, allowedPages) VALUES (?, ?, ?, ?)",
      'user',
      hashedPassword,
      'USER',
      JSON.stringify(['/page1', '/page2', '/page3', '/home', '/s3-summary', '/label-summary']) // User has access to specific pages
    );
    console.log('Default user created.');
  }

  return db;
}

export async function getAllUsers() {
  const db = await open({
    filename: DATABASE_FILE,
    driver: sqlite3.Database,
  });
  // Exclude password from the results for security reasons
  const users = await db.all("SELECT id, username, role, allowedPages FROM users");
  return users;
}
