const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host:               process.env.DB_HOST     || 'localhost',
    port:               parseInt(process.env.DB_PORT) || 3306,
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASSWORD || '',
    database:           process.env.DB_NAME     || 'mku_attendance',
    multipleStatements: true
  });

  const sql = `
CREATE TABLE IF NOT EXISTS venues (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  building      VARCHAR(100),
  floor         VARCHAR(20),
  venue_type    ENUM(
                  'lecture_hall',
                  'lab',
                  'seminar_room',
                  'outdoor',
                  'field',
                  'auditorium'
                ) NOT NULL,
  latitude      DECIMAL(10, 8) NOT NULL,
  longitude     DECIMAL(11, 8) NOT NULL,
  radius_meters INT NOT NULL,
  wifi_bssid    VARCHAR(50),
  capacity      INT,
  is_active     BOOLEAN DEFAULT true,
  created_by    VARCHAR(36),
  created_at    TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE sessions ADD COLUMN venue_id INT REFERENCES venues(id);
ALTER TABLE sessions ADD COLUMN session_lat DECIMAL(10,8);
ALTER TABLE sessions ADD COLUMN session_lng DECIMAL(11,8);
ALTER TABLE sessions ADD COLUMN session_radius INT;

INSERT INTO venues (name, building, floor, venue_type, latitude, longitude, radius_meters, capacity)
VALUES
  ('LH 101', 'Main Block', 'Ground', 'lecture_hall', -1.04567, 37.07345, 100, 200),
  ('LH 102', 'Main Block', 'Ground', 'lecture_hall', -1.04570, 37.07350, 100, 150),
  ('ICT Lab 1', 'Science Block', '1st', 'lab', -1.04600, 37.07400, 80, 60),
  ('Sports Ground', 'Outdoors', 'Ground', 'outdoor', -1.04700, 37.07500, 300, 500);
`;

  try {
    await connection.query(sql);
    console.log('Successfully applied database updates.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

run();
