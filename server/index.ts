import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'; // Import cors
import connectDB from './config/db';
import authRoutes from './routes/auth'; // Import auth routes
import scheduleRoutes from './routes/schedule'; // Import schedule routes
import generalScheduleRoutes from './routes/generalSchedule'; // Import general schedule routes

dotenv.config();

const app = express();

// Enable CORS
app.use(cors());

// Connect to database
connectDB();

// Middleware
app.use(express.json());

// Use auth routes
app.use('/api/auth', authRoutes);
// Use schedule routes
app.use('/api/schedule', scheduleRoutes);
// Use general schedule routes
app.use('/api/general-schedule', generalScheduleRoutes);

// Define a simple route for testing
app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 