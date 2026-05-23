const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Shyam2402@',
  database: 'postgres'
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL');
    
    // Check for tables
    const tableCheck = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('users', 'bulk_candidates');"
    );
    console.log('\n--- Tables Found ---');
    console.log(tableCheck.rows);
    
    // Check columns for users table
    console.log('\n--- Columns for users table ---');
    const usersColumns = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='users' ORDER BY ordinal_position;`
    );
    console.log(usersColumns.rows);
    
    // Check columns for bulk_candidates table
    console.log('\n--- Columns for bulk_candidates table ---');
    const bulkColumns = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='bulk_candidates' ORDER BY ordinal_position;`
    );
    console.log(bulkColumns.rows);
    
    // Check if users table has image column
    console.log('\n--- Check for image column in users table ---');
    const imageColumn = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='image';`
    );
    if (imageColumn.rows.length > 0) {
      console.log('? "image" column EXISTS in users table');
      console.log(imageColumn.rows);
    } else {
      console.log('? "image" column DOES NOT EXIST in users table');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
