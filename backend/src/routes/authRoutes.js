const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

// =====================================
// API ĐĂNG KÝ
// =====================================
router.post('/register', authController.register);


// =====================================
// API ĐĂNG NHẬP
// =====================================
router.post('/login', authController.login);


module.exports = router;