const mysql = require('mysql2/promise');

async function resetDb() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'root'
    });

    try {
        await connection.query('DROP DATABASE IF EXISTS timetable');
        console.log('Database "timetable" dropped successfully.');
    } catch (err) {
        console.error('Error dropping database:', err);
    } finally {
        await connection.end();
    }
}

resetDb();
