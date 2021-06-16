const express = require("express");
const app = express();
const port = 3001;

app.get('/', (req, res) => {
    res.send("This is the home page");
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
})
