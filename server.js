// host the redirect URI
const express = require("express");
const app = express();

const server = app.listen(3000, () => {
    console.log("Server listening on port 3000");
});

app.get("/callback", (__req, res) => {
    res.send("<script>window.close();</script>");
});

app.get("/close", (__req, __res) => {
    server.close(() => {
        console.log("Server closed")
    });
})

module.exports = app;