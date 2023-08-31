const express = require("express");
const router = express.Router();

router.get("/", async (reeq, res) => {
    try {
        res.json({
            status: 200,
            message: "Get data success"
        })
    } catch (error) {
        console.error(error);
    }
})

module.exports = router;