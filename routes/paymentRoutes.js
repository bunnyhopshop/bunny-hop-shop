const express = require("express");
const { initiatePayment } = require("../controllers/paymentController.js");

const router = express.Router();

router.post("/pay", initiatePayment);

module.exports = router;
