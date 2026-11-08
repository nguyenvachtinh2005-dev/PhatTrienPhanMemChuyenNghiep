const express = require("express");
const cors = require("cors");

const app = express();

// Cấu hình CORS cho Frontend
app.use(cors({
    origin: "http://localhost:5500"
}));

// Cho phép Backend nhận dữ liệu JSON
app.use(express.json());

// API kiểm tra hoạt động
app.get("/", (req, res) => {
    res.json({
        message: "HealBooking API is running!"
    });
});

module.exports = app;