"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors")); // Import cors
const db_1 = __importDefault(require("./config/db"));
const auth_1 = __importDefault(require("./routes/auth")); // Import auth routes
const schedule_1 = __importDefault(require("./routes/schedule")); // Import schedule routes
const generalSchedule_1 = __importDefault(require("./routes/generalSchedule")); // Import general schedule routes
dotenv_1.default.config();
const app = (0, express_1.default)();
// Enable CORS
app.use((0, cors_1.default)());
// Connect to database
(0, db_1.default)();
// Middleware
app.use(express_1.default.json());
// Use auth routes
app.use('/api/auth', auth_1.default);
// Use schedule routes
app.use('/api/schedule', schedule_1.default);
// Use general schedule routes
app.use('/api/general-schedule', generalSchedule_1.default);
// Define a simple route for testing
app.get('/', (req, res) => {
    res.send('API is running...');
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
