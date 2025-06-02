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
const ScheduleItem_1 = __importDefault(require("../models/ScheduleItem"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const router = express_1.default.Router();
// @route   POST api/schedule
// @desc    Create a schedule item
// @access  Private
router.post('/', authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { description, date, status } = req.body;
    try {
        const newScheduleItem = new ScheduleItem_1.default({
            user: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
            description,
            date,
            status,
        });
        const scheduleItem = yield newScheduleItem.save();
        res.json(scheduleItem);
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
}));
// @route   GET api/schedule
// @desc    Get all schedule items for a user (either authenticated or specified by userId), optionally filtered by date range
// @access  Private
router.get('/', authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Use userId from query params if provided, otherwise use authenticated user's id
        const targetUserId = req.query.userId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        if (!targetUserId) {
            return res.status(401).json({ msg: 'User not authenticated or target user ID not provided' });
        }
        const { start_date, end_date } = req.query;
        let query = { user: targetUserId };
        // If start_date and end_date are provided, filter by date range
        if (start_date && end_date) {
            query.date = {
                $gte: new Date(start_date),
                $lt: new Date(end_date),
            };
        }
        // Also ensure we only fetch items for the target user
        query.user = targetUserId;
        const scheduleItems = yield ScheduleItem_1.default.find(query).sort({ date: 1 });
        res.json(scheduleItems);
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
}));
// @route   PUT api/schedule/:id
// @desc    Update or delete a schedule item based on status
// @access  Private
router.put('/:id', authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { status, reason } = req.body; // Expecting 'status' and optional 'reason' fields
    try {
        // If status is null or empty, delete the item (equivalent to not marked)
        if (status === null || status === '') {
            const scheduleItem = yield ScheduleItem_1.default.findOneAndDelete({
                _id: req.params.id,
                user: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
            });
            if (!scheduleItem) {
                return res.status(404).json({ msg: 'Schedule item not found or not owned by user' });
            }
            // Respond with success message for deletion
            return res.json({ msg: 'Schedule item removed (status reset)' });
        }
        else {
            // If status is provided, update the item
            const updateData = { status };
            if (reason !== undefined) {
                updateData.reason = reason;
            }
            let scheduleItem = yield ScheduleItem_1.default.findOneAndUpdate({ _id: req.params.id, user: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id }, { $set: updateData }, { new: true } // Return the updated document
            );
            if (!scheduleItem) {
                return res.status(404).json({ msg: 'Schedule item not found or not owned by user' });
            }
            // Respond with the updated item
            res.json(scheduleItem);
        }
    }
    catch (err) {
        console.error(err.message);
        // Handle case where id is not a valid ObjectId
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Schedule item not found or not owned by user' });
        }
        res.status(500).send('Server Error');
    }
}));
// @route   DELETE api/schedule/:id
// @desc    Delete a schedule item
// @access  Private
router.delete('/:id', authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const scheduleItem = yield ScheduleItem_1.default.findOneAndDelete({
            _id: req.params.id,
            user: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
        });
        if (!scheduleItem) {
            return res.status(404).json({ msg: 'Schedule item not found' });
        }
        res.json({ msg: 'Schedule item removed' });
    }
    catch (err) {
        console.error(err.message);
        // Handle case where id is not a valid ObjectId
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Schedule item not found' });
        }
        res.status(500).send('Server Error');
    }
}));
exports.default = router;
