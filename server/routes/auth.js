"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const router = express_1.default.Router();
// @route   POST api/auth/login
// @desc    Authenticate or Register user by username & get token
// @access  Public
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username } = req.body;
    try {
        let user = yield User_1.default.findOne({ username });
        // If user doesn't exist, create a new one
        if (!user) {
            user = new User_1.default({ username });
            yield user.save();
        }
        // Generate JWT token
        const payload = { user: { id: user.id } };
        jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, // Token expires in 1 hour
        (err, token) => {
            if (err)
                throw err;
            res.json({ token });
        });
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
}));
// @route   GET api/auth/users
// @desc    Get all users (for viewing purposes)
// @access  Private
router.get('/users', authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Find all users and select only the id and username fields
        const users = yield User_1.default.find().select('_id username');
        res.json(users);
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
}));
exports.default = router;
