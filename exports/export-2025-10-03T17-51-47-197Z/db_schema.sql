-- SuperSpace DB schema (Postgres)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS player_data (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analytics_daily_stats (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  stats JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(255) NOT NULL,
  player_id VARCHAR(255),
  session_id VARCHAR(255),
  data JSONB NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS analytics_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  player_id VARCHAR(255),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_ms INTEGER,
  events_count INTEGER DEFAULT 0,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data JSONB,
  date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS analytics_meta (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_date ON analytics_events(date);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_date ON analytics_sessions(date);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_player ON analytics_sessions(player_id);
