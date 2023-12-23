require('dotenv').config();
const { MongoClient } = require('mongodb');

const url = process.env.MONGODB_URI;
const client = new MongoClient(url);
const dbName = process.env.DB_NAME;

async function connect() {
	await client.connect();
	console.log('Connected successfully to MongoDB server');
	const db = client.db(dbName);
	return db;
}

module.exports = { connect };
