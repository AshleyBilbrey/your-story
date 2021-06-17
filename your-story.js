const express = require("express");
const app = express();
const port = 3001;

app.set("view engine", "ejs");
app.use(express.static("static"));

const nodemailer = require("nodemailer");
var mongo = require('mongodb'); 
var session = require('express-session');
var crypto = require("crypto");

var MongoClient = require('mongodb').MongoClient;
var mongourl = "mongodb://localhost:27017/your-story";

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
    newLogin(req.body.email);
    res.render("sentmail.ejs", {
        email: req.body.email
    });
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
})

function newLogin(email) {
    MongoClient.connect(mongourl, (err, db) => {
        if(err) throw err;
        var dbo = db.db("your-story");
        dbo.collection("users").findOne({email: email.toLowerCase()}, (err, result) => {
            if (err) throw err
            let expiry = new Date;
            let expirytime = expiry.getTime() + (1000 * 60 * 15); // 15 Minutes
            let string = crypto.randomBytes(64).toString('hex').slice(0, 64);
            console.log("User pulled from DB");
            console.log(result);
            if (result) {
                dbo.collection("users").updateOne({email: email.toLowerCase()}, {
                    $set: {
                        linkexpiry: expirytime,
                        loginlink: string
                    }
                })
            } else {
                // Onboard new user
                let toInsert = {
                    email: email.toLowerCase(),
                    linkexpiry: expirytime,
                    loginlink: string
                }
                dbo.collection("users").insertOne(toInsert);
            }
            mailLink(string, email);
        })
    })
}

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