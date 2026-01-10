import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';

export async function initDbConn(): Promise<void> {
	if (!MONGODB_URI) {
		throw new Error('MONGODB_URI is not defined in the environment variables');
	}
	try {
		await mongoose.connect(MONGODB_URI);
		console.log('Connected to MongoDB');
	} catch (error) {
		console.error('Failed to connect to MongoDB:', error);
		throw error;
	}
}
