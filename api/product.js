const express = require("express");
const router = express.Router();

const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.get("/", async (req, res) => {

    try {
        res.status(200).json({message:"ok"});
    } catch (error) {
        console.error();
    }

})


app.get("/login", async (req, res) => {

    try {
        res.status(200).json({message:"user login"});
    } catch (error) {
        console.error();
    }

})

module.exports = app;
