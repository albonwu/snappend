// host the redirect URI
const express = require("express");
const app = express();

app.get("/callback", (__req, res) => {
    res.send("<script>window.close();</script>");
});

app.listen(3000, () => {
    console.log('Server listening on port 3000');
});

module.exports = app;