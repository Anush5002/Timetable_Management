const mysql = require('mysql2/promise');

const LAB_EQUIPMENT = JSON.stringify([
    "Chairs", "Computers (Working)", "Network", "White Board"
]);

const LECTURE_EQUIPMENT = JSON.stringify([
    "Chairs", "White Board", "Projector", "Podium"
]);

const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: 'root', // Default based on server.js
    database: 'timetable',
    multipleStatements: true
};

async function populateRooms() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(DB_CONFIG);

        console.log('Clearing existing Rooms and related data...');
        // We must clear Timetable and Resource_Usage to avoid FK constraints or data inconsistency
        await connection.query('DELETE FROM Resource_Usage');
        await connection.query('DELETE FROM Timetable');
        // Now safe to delete rooms
        await connection.query('DELETE FROM Rooms');

        // Also recommended to clear Lab_Groups if they depend on rooms, but user didn't mention it.
        // Checking schema: Lab_Groups has room_id. Ideally clear it or set to NULL.
        // Let's set to NULL to preserve groups if possible, or delete.
        // Given the request is "clear all rooms", old room_ids are invalid.
        await connection.query('UPDATE Lab_Groups SET room_id = NULL');
        // Classes also have room_no varchar? 
        // Schema: Classes.room_no VARCHAR(20). It's loose coupling or just a string?
        // Let's clear default rooms in Classes to avoid confusion.
        await connection.query('UPDATE Classes SET room_no = NULL');

        console.log('Generating new rooms...');

        const buildings = [
            { id: 1, floors: 4, roomsPerFloor: 28, lastFloorRooms: 24 },
            { id: 2, floors: 4, roomsPerFloor: 28, lastFloorRooms: 24 },
            { id: 3, floors: 4, roomsPerFloor: 28, lastFloorRooms: 24 },
            { id: 4, floors: 4, roomsPerFloor: 28, lastFloorRooms: 24 }
        ];

        let values = [];

        for (const b of buildings) {
            for (let f = 1; f <= b.floors; f++) {
                const roomCount = (f === b.floors) ? b.lastFloorRooms : b.roomsPerFloor;

                for (let r = 1; r <= roomCount; r++) {
                    // Format: B F RR (e.g., 1 1 01 -> 1101)
                    // Ensure 2 digits for room number
                    const roomNumStr = `${b.id}${f}${String(r).padStart(2, '0')}`;
                    const roomName = roomNumStr; // e.g. "1101"
                    const roomId = parseInt(roomName); // Use room number as ID

                    // Logic for Type: 
                    // User didn't specify which are labs vs lectures.
                    // Previous logic: Every 4th room is a Lab.
                    // I will keep this heuristic unless specified otherwise.
                    // r = 4, 8, 12... -> Lab
                    const isLab = (r % 4 === 0);
                    const type = isLab ? 'Lab' : 'Lecture';
                    const capacity = 60; // Standard capacity
                    const equipment = isLab ? LAB_EQUIPMENT : LECTURE_EQUIPMENT;

                    values.push([roomId, roomName, capacity, type, equipment]);
                }
            }
        }

        if (values.length > 0) {
            // Bulk insert
            const sql = 'INSERT INTO Rooms (room_id, room_name, capacity, type, equipment) VALUES ?';
            await connection.query(sql, [values]);
            console.log(`Successfully inserted ${values.length} rooms.`);
        }

        console.log('Done.');

    } catch (err) {
        console.error('Error populating rooms:', err);
    } finally {
        if (connection) await connection.end();
    }
}

populateRooms();
