const express = require("express");
const app = express();
const port = 3001;

app.set("view engine", "ejs");
app.use(express.static("static"));

app.get('/', (req, res) => {
    res.render("splash.ejs");
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
})
