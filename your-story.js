const express = require("express");
const app = express();
const port = 3001;

app.set("view engine", "ejs");
app.use(express.static("static"));

const nodemailer = require("nodemailer");

app.use(express.urlencoded({extended: true}));
app.use(express.json())

const { body, validationResult } = require('express-validator');

app.get('/', (req, res) => {
    res.render("splash.ejs");
})

app.get('/login', (req, res) => {
    res.render("login.ejs");
})

app.post('/login', body('email').isEmail(), (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.render("loginfail.ejs")
    }
    console.log(req.body);
    mailLink("abc123", req.body.email).catch((err) => {
        res.render("generror.ejs");
        console.log(err);
    });
    res.render("sentmail.ejs", {
        email: req.body.email
    });
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
})

async function mailLink(token, email) {
    let testAccount = await nodemailer.createTestAccount();

    let transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass
        }
    })

    let info = await transporter.sendMail({
        from: '"Your Story" <your-story@yourstory-pride.com',
        to: email,
        subject: "Your Story Login Link",
        html: "Hello friend! Here is your login link for Your Story!<br><br><a href='http://localhost:3001/session?token=" + token + "'>http://localhost:3001/session?token=" + token + "</a><br><br>This link will expire in 15 minutes. If you did not request this link, no worries, just ignore this email."
    })

    console.log("Message sent: " + info.messageId);

    console.log("URL to see test email: " + nodemailer.getTestMessageUrl(info));

}
