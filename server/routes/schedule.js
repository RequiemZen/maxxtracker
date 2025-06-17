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
const TemporaryScheduleItem_1 = __importDefault(require("../models/TemporaryScheduleItem"));
const GeneralScheduleItem_1 = __importDefault(require("../models/GeneralScheduleItem"));
const router = express_1.default.Router();
// @route   POST api/schedule
// @desc    Create a schedule item
// @access  Private
router.post('/', authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { definitionId, description, date, status } = req.body;
    try {
        const newScheduleItem = new ScheduleItem_1.default({
            user: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
            definitionId,
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
// @desc    Get all relevant schedule items for a user on a specific date range
// @access  Private
router.get('/', authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const targetUserId = req.query.userId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        if (!targetUserId) {
            return res.status(401).json({ msg: 'User not authenticated or target user ID not provided' });
        }
        const { start_date, end_date } = req.query;
        if (!start_date || !end_date) {
            return res.status(400).json({ msg: 'start_date and end_date are required query parameters' });
        }
        const startDateUTC = new Date(start_date);
        const endDateUTC = new Date(end_date);
        const generalItems = yield GeneralScheduleItem_1.default.find({ user: targetUserId }).select('_id description weekDays');
        const temporaryDefinitions = yield TemporaryScheduleItem_1.default.find({
            user: targetUserId,
            startDate: { $lte: endDateUTC },
            endDate: { $gte: startDateUTC },
        }).select('_id description startDate endDate createdAt');
        const actualEntries = yield ScheduleItem_1.default.find({
            user: targetUserId,
            date: {
                $gte: startDateUTC,
                $lt: endDateUTC,
            },
        }).select('_id description date status reason definitionId');
        res.json({
            generalItems: Array.isArray(generalItems) ? generalItems : [],
            temporaryDefinitions: Array.isArray(temporaryDefinitions) ? temporaryDefinitions : [],
            actualEntries: Array.isArray(actualEntries) ? actualEntries : [],
        });
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
    const { status, reason } = req.body;
    try {
        if (status === null || status === '') {
            const scheduleItem = yield ScheduleItem_1.default.findOneAndDelete({
                _id: req.params.id,
                user: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
            });
            if (!scheduleItem) {
                return res.status(404).json({ msg: 'Schedule item not found or not owned by user' });
            }
            return res.json({ msg: 'Schedule item removed' });
        }
        else {
            const updateData = { status };
            if (reason !== undefined) {
                updateData.reason = reason;
            }
            let scheduleItem = yield ScheduleItem_1.default.findOneAndUpdate({ _id: req.params.id, user: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id }, { $set: updateData }, { new: true });
            if (!scheduleItem) {
                return res.status(404).json({ msg: 'Schedule item not found or not owned by user' });
            }
            res.json(scheduleItem);
        }
    }
    catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Schedule item not found' });
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
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Schedule item not found' });
        }
        res.status(500).send('Server Error');
    }
}));
// @route   POST api/schedule/temporary
// @desc    Create a temporary schedule item definition
// @access  Private
router.post('/temporary', authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { description, startDate, endDate } = req.body;
        if (!user) {
            return res.status(401).json({ msg: 'User not authenticated' });
        }
        const newTemporaryScheduleItem = new TemporaryScheduleItem_1.default({
            user,
            description,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
        });
        const temporaryItem = yield newTemporaryScheduleItem.save();
        res.status(201).json(temporaryItem);
    }
    catch (error) {
        console.error('Error creating temporary schedule item:', error);
        res.status(500).json({ message: 'Error creating temporary schedule item', error });
    }
}));
// @route   GET api/schedule/temporary
// @desc    Get all temporary schedule item definitions for a user
// @access  Private
router.get('/temporary', authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const targetUserId = req.query.userId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        if (!targetUserId) {
            return res.status(401).json({ msg: 'User not authenticated or target user ID not provided' });
        }
        const temporaryDefinitions = yield TemporaryScheduleItem_1.default.find({ user: targetUserId }).sort({ createdAt: 1 });
        res.json(temporaryDefinitions);
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
}));
// @route   GET api/schedule/debug/temporary
// @desc    Debug endpoint to show all temporary items
// @access  Private
router.get('/debug/temporary', authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const targetUserId = req.query.userId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        if (!targetUserId) {
            return res.status(401).json({ msg: 'User not authenticated or target user ID not provided' });
        }
        const temporaryDefinitions = yield TemporaryScheduleItem_1.default.find({ user: targetUserId });
        // Преобразуем даты в ISO строки для удобства чтения
        const formattedDefinitions = temporaryDefinitions.map(def => ({
            _id: def._id,
            description: def.description,
            startDate: def.startDate.toISOString(),
            endDate: def.endDate.toISOString(),
            createdAt: def.createdAt.toISOString()
        }));
        res.json(formattedDefinitions);
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
}));
// @route   PUT api/schedule/temporary/:id
// @desc    Update a temporary schedule item definition
// @access  Private
router.put('/temporary/:id', authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const definitionId = req.params.id;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { description, startDate, endDate } = req.body;
        if (!userId) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
        const updateFields = {};
        if (description !== undefined)
            updateFields.description = description;
        // Преобразуем даты в UTC Date объекты перед сохранением
        if (startDate !== undefined)
            updateFields.startDate = new Date(startDate);
        if (endDate !== undefined)
            updateFields.endDate = new Date(endDate);
        // Find and update the temporary definition, ensure it belongs to the user
        const updatedDefinition = yield TemporaryScheduleItem_1.default.findOneAndUpdate({ _id: definitionId, user: userId }, { $set: updateFields }, { new: true } // Return the updated document
        ).select('_id description startDate endDate createdAt');
        if (!updatedDefinition) {
            return res.status(404).json({ msg: 'Temporary schedule item not found or user not authorized' });
        }
        // TODO: Decide if related ScheduleItem entries should be updated (e.g., description change)
        // If description changes, should old ScheduleItem entries also update their description?
        // For now, we are not updating existing ScheduleItem entries on definition edit.
        res.json(updatedDefinition);
    }
    catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Temporary schedule item not found' });
        }
        res.status(500).send('Server Error');
    }
}));
// @route   DELETE api/schedule/temporary/:id
// @desc    Delete a temporary schedule definition and associated schedule items
// @access  Private
router.delete('/temporary/:id', authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const definitionId = req.params.id;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
        // Find and delete the temporary definition, ensure it belongs to the user
        const deletedDefinition = yield TemporaryScheduleItem_1.default.findOneAndDelete({ _id: definitionId, user: userId });
        if (!deletedDefinition) {
            return res.status(404).json({ msg: 'Temporary schedule item not found or user not authorized' });
        }
        // Delete all associated ScheduleItem entries
        yield ScheduleItem_1.default.deleteMany({ definitionId: definitionId, user: userId });
        res.json({ msg: 'Temporary schedule item and associated entries deleted' });
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
}));
exports.default = router;
