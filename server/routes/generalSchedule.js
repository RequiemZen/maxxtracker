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
const GeneralScheduleItem_1 = __importDefault(require("../models/GeneralScheduleItem"));
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const router = express_1.default.Router();
// @route   POST api/general-schedule
// @desc    Create a general schedule item
// @access  Private
router.post('/', authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { description } = req.body;
    try {
        const newGeneralScheduleItem = new GeneralScheduleItem_1.default({
            user: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
            description,
        });
        const generalScheduleItem = yield newGeneralScheduleItem.save();
        res.json(generalScheduleItem);
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
}));
// @route   GET api/general-schedule
// @desc    Get all general schedule items for a user
// @access  Private
router.get('/', authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const generalScheduleItems = yield GeneralScheduleItem_1.default.find({ user: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id }).sort({ createdAt: 1 });
        res.json(generalScheduleItems);
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
}));
// @route   DELETE api/general-schedule/:id
// @desc    Delete a general schedule item
// @access  Private
router.delete('/:id', authMiddleware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const generalScheduleItem = yield GeneralScheduleItem_1.default.findOneAndDelete({
            _id: req.params.id,
            user: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
        });
        if (!generalScheduleItem) {
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
