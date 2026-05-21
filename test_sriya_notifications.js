const express = require('express');
const { getNotificationsService } = require('./src/modules/notifications/notifications.service');
const { pool } = require('./config/db');
require('dotenv').config();

async function testFetch() {
    try {
        const result = await pool.query("SELECT id, name, email, role FROM users WHERE name ILIKE '%sriya%'");
        console.log("Sriya users:", result.rows);
        
        if (result.rows.length > 0) {
            const userId = result.rows[0].id; // 74
            const notifs = await getNotificationsService(userId);
            console.log(`Notifications for Sriya (userId ${userId}):`, notifs);
        }
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
testFetch();
