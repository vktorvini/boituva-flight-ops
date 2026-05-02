import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("No DATABASE_URL found.")
    exit(1)

engine = create_engine(DATABASE_URL, connect_args={"sslmode": "require"})

commands = [
    "ALTER TABLE weather_normalized ADD COLUMN IF NOT EXISTS wind_direction FLOAT;",
    "ALTER TABLE flight_status ADD COLUMN IF NOT EXISTS wind_direction FLOAT;",
    "ALTER TABLE flight_history_supabase ADD COLUMN IF NOT EXISTS wind_direction FLOAT;"
]

with engine.connect() as conn:
    for cmd in commands:
        try:
            conn.execute(text(cmd))
            print(f"Executed: {cmd}")
        except Exception as e:
            print(f"Error executing {cmd}: {e}")
    conn.commit()

print("Migration completed.")
