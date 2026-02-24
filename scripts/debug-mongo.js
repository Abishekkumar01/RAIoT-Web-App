const mongoose = require('mongoose');

const MONGODB_URI = "mongodb://raiotwebsite:whatissecurity@140.238.225.254:27017/raiotweb";

async function test() {
    console.log('Attempting to connect to MongoDB at 140.238.225.254...');

    const startTime = Date.now();
    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
        });
        console.log('Connected successfully in ' + (Date.now() - startTime) + 'ms');
        await mongoose.disconnect();
    } catch (err) {
        console.error('Connection failed after ' + (Date.now() - startTime) + 'ms');
        console.error('Error Name:', err.name);
        console.error('Error Message:', err.message);
        if (err.message.includes('ETIMEDOUT')) {
            console.error('Diagnosis: Network Timeout. The server is likely unreachable or a firewall is blocking the connection.');
        } else if (err.message.includes('Authentication failed')) {
            console.error('Diagnosis: Authentication failed. The credentials might be incorrect.');
        }
        process.exit(1);
    }
}

test();
