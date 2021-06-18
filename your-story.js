const express = require("express");
const app = express();
const port = 3001;

app.set("view engine", "ejs");
app.use(express.static("static"));

const nodemailer = require("nodemailer");
var mongo = require('mongodb'); 
var session = require('express-session');
var crypto = require("crypto");

let flagfiles = ["blank", "agender", "aromantic", "asexual", "bisexual", "genderfluid", "genderqueer", "intersex", "lesbian", "lgbt", "non-binary", "pansexual", "polysexual", "progressive-pride", "transgender"];
let flagnames = ["Blank", "Agender", "Aromantic", "Asexual", "Bisexual", "Genderfluid", "Genderqueer", "Intersex", "Lesbian", "LGBTQ+", "Non-binary", "Pansexual", "Polysexual", "Progressive Pride", "Transgender"];

app.use(session({
    secret: 'Implement dotenv',
    resave: false,
    saveUninitialized: true,
    credentials: 'include',
    cookie: { 
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));

var MongoClient = require('mongodb').MongoClient;
var mongourl = "mongodb://localhost:27017/your-story";

app.use(express.urlencoded({extended: true}));
app.use(express.json())

const { body, validationResult } = require('express-validator');

app.get('/', (req, res) => {
    console.log(req.sessionID);
    console.log(req.session.userid);
    if(req.session.userid) {
        res.redirect("/story")
    } else {
        res.render("splash.ejs");
    }
    
})

app.get('/login', (req, res) => {
    console.log(req.sessionID)
    res.render("login.ejs");
})

app.post('/login', body('email').isEmail(), (req, res) => {
    console.log(req.sessionID)
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

app.get('/session', (req, res) => {
    if(req.query.token) {
        MongoClient.connect(mongourl, { useUnifiedTopology: true }, (err, db) => {
            if(err) throw err;
            var dbo = db.db("your-story");
            dbo.collection("users").findOne({ loginlink: req.query.token }, (err, result) => {
                if (err) throw err;
                if(result) {
                    let d = new Date;
                    if(result.linkexpiry > d.getTime()) {
                        req.session.userid = result._id;
                        req.session.email = result.email;
                        console.log(req.sessionID);
                        console.log(req.session.userid);
                        res.redirect("/story");
                    } else {
                        res.render("sessionissue.ejs")
                    }
                } else {
                    res.render("sessionissue.ejs")
                }
            });
        });
    } else {
        res.render("sessionissue.ejs");
    }
})

app.get('/story', requiresLogin, (req, res, next) => {
    MongoClient.connect(mongourl, { useUnifiedTopology: true }, (err, db) => {
        if(err) throw err;
        var dbo = db.db("your-story");
        console.log("userid");
        console.log(req.session.userid);
        dbo.collection("users").findOne({ "_id": mongo.ObjectId(req.session.userid) }, (err, result) => {
            if(err) throw err;
            if(result) {
                let findnum = 1;
                if(result.currentpost) {
                    findnum = result.currentpost;
                }
                dbo.collection("posts").findOne({ postnum: findnum }, (err, result) => {
                    if(result) {
                        let toPass = {
                            title: result.title,
                            content: result.content,
                            flag: result.flag,
                            heartmoji: "❤️",
                            profileid: req.session.userid,
                            postid: result.postnum
                        }
                        console.log(result.postnum);
                        dbo.collection("hearts").findOne({ user: req.session.userid, postnum: parseInt(result.postnum) }, (err, result) => {
                            console.log(result);
                            if(result) {
                                console.log("They love this post <3")
                                toPass.heartmoji = "💖";
                                res.render("story.ejs", toPass);
                            } else {
                                res.render("story.ejs", toPass);
                            }
                            
                        })
                        
                    } else {
                        res.redirect("/next")
                    }
                })
            } else {
                console.log("cannot find user");
                res.render("generror.ejs")
            }
        })
    })
})

app.get("/next", requiresLogin, (req, res, next) => {
    MongoClient.connect(mongourl, { useUnifiedTopology: true }, (err, db) => {
        if(err) throw err;
        let dbo = db.db("your-story");
        dbo.collection("users").findOne({ "_id": mongo.ObjectId(req.session.userid) }, (err, result) => {
            if(err) throw err;
            if(result) {
                if(result.currentpost) {
                    dbo.collection("posts").find({ postnum: { $gt: result.currentpost } }).sort({ postnum: 1 }).limit(1).toArray((err, result) => {
                        if(result[0]) {
                            dbo.collection("users").updateOne({ "_id": mongo.ObjectID(req.session.userid) }, {
                                $set: {
                                    currentpost: result[0].postnum
                                }
                            }).then(() => {
                                res.redirect("/story");
                            })
                        } else {
                            dbo.collection("users").updateOne({ "_id": mongo.ObjectID(req.session.userid) }, {
                                $set: {
                                    currentpost: 1
                                }
                            }).then(() => {
                                res.redirect("/story");
                            })
                        }
                    })
                }
            } else {
                res.render("generror.ejs")
            }
        });
    });
});

app.get("/heart/:postnum", requiresLogin, (req, res, next) => {
    MongoClient.connect(mongourl, { useUnifiedTopology: true }, (err, db) => {
        if(err) throw err;
        let dbo = db.db("your-story");
        dbo.collection("hearts").findOne({ user: req.session.userid, postnum: parseInt(req.params.postnum) }, (err, result) => {
            if(err) throw err;
            if(!result) {
                dbo.collection("hearts").insertOne({ user: req.session.userid, postnum: parseInt(req.params.postnum) }).then(() => {
                    res.redirect("/story");
                });
            } else {
                dbo.collection("hearts").deleteOne({ user: req.session.userid, postnum: parseInt(req.params.postnum) }).then(() => {
                    res.redirect("/story");
                })
                
            }
        })
    })
})

app.get("/heart/:postnum/back", requiresLogin, (req, res, next) => {
    MongoClient.connect(mongourl, { useUnifiedTopology: true }, (err, db) => {
        if(err) throw err;
        let dbo = db.db("your-story");
        dbo.collection("hearts").findOne({ user: req.session.userid, postnum: parseInt(req.params.postnum) }, (err, result) => {
            if(err) throw err;
            if(!result) {
                dbo.collection("hearts").insertOne({ user: req.session.userid, postnum: parseInt(req.params.postnum) }).then(() => {
                    res.redirect("/post/" + req.params.postnum);
                });
            } else {
                dbo.collection("hearts").deleteOne({ user: req.session.userid, postnum: parseInt(req.params.postnum) }).then(() => {
                    res.redirect("/post/" + req.params.postnum);
                })
                
            }
        })
    })
})

app.get("/logout", (req, res) => {
    req.session.email = null;
    req.session.userid = null;
    res.redirect("/");
})

app.get("/post", requiresLogin, (req, res, next) => {
    res.render("post.ejs", {
        flagfiles: flagfiles,
        flagnames: flagnames
    });
})

app.post("/post", requiresLogin, (req, res, next) => {
    if(req.body.title && req.body.content && req.body.flag) {
        if(req.body.title.length > 0 && req.body.content.length > 0) {
            let validImage = false;
            for(let i = 0; i < flagfiles.length; i++) {
                if(req.body.flag == flagfiles[i]) {
                    validImage = true;
                }
            }
            if(validImage) {
                MongoClient.connect(mongourl, { useUnifiedTopology: true }, (err, db) => {
                    if(err) throw err;
                    var dbo = db.db("your-story");
                    dbo.collection("posts").find().sort({ postnum: -1 }).limit(1).toArray((err, result) => {
                        let newpostnum;
                        console.log(result[0]);
                        if(result[0]) {
                            newpostnum = result[0].postnum + 1;
                        } else {
                            newpostnum = 1;
                        }
                        dbo.collection("posts").insertOne({
                            title: req.body.title,
                            content: req.body.content,
                            postnum: newpostnum,
                            poster: req.session.userid,
                            flag: req.body.flag
                        }).then(() => {
                            res.redirect("/post/" + newpostnum)
                        })
                    });
                })
            }
        } else {
            res.render("generror.ejs");
        }
    } else {
        res.render("generror.ejs");
    }
})

app.get("/post/:postnum", requiresLogin, (req, res, next) => {
    MongoClient.connect(mongourl, { useUnifiedTopology: true}, (err, db) => {
        if(err) throw err;
        var dbo = db.db("your-story");
        console.log(req.params.postnum);
        dbo.collection("posts").findOne({ postnum: parseInt(req.params.postnum) }, (err, result) => {
            if(result) {
                let toPass = {
                    title: result.title,
                    content: result.content,
                    flag: result.flag,
                    heartmoji: "❤️",
                    profileid: req.session.userid,
                    postid: result.postnum
                }
                console.log(result.postnum);
                dbo.collection("hearts").findOne({ user: req.session.userid, postnum: parseInt(result.postnum) }, (err, result) => {
                    console.log(result);
                    if(result) {
                        console.log("They love this post <3")
                        toPass.heartmoji = "💖";
                        res.render("textpost.ejs", toPass);
                    } else {
                        res.render("textpost.ejs", toPass);
                    }
                    
                })
                
            } else {
                res.render("generror.ejs")
            }
        })
    })
})


app.listen(port, () => {
    console.log(`Your Story listening at http://localhost:${port}`);
})

function requiresLogin(req, res, next) {
    if(!req.session.userid) {
        res.redirect("/login");
    } else {
        next()
    }
}

function newLogin(email) {
    MongoClient.connect(mongourl, { useUnifiedTopology: true }, (err, db) => {
        if(err) throw err;
        var dbo = db.db("your-story");
        dbo.collection("users").findOne({ "email": email.toLowerCase() }, (err, result) => {
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
                        loginlink: string,
                        used: false
                    }
                })
            } else {
                // Onboard new user
                let toInsert = {
                    email: email.toLowerCase(),
                    linkexpiry: expirytime,
                    loginlink: string,
                    used: false
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
        html: "Hello friend! Here is the login link for Your Story! \
               <br><br><a href='http://localhost:3001/session?token=" 
               + token + "'>http://localhost:3001/session?token=" + 
               token + "</a><br><br>This link will expire in 15 minutes. \
               If you did not request this link, no worries, just ignore \
               this email."
    })

    console.log("Message sent: " + info.messageId);

    console.log("URL to see test email: " + nodemailer.getTestMessageUrl(info));

}