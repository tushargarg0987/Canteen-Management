//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session")
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")
const findOrCreate = require('mongoose-findorcreate')


// const md5 = require("md5")
// const bcrypt = require("bcrypt");
// const saltRounds = 10;

const getDate = () => {
    const today = new Date();
            const yyyy = today.getFullYear();
            let mm = today.getMonth() + 1;
            let dd = today.getDate();

            if (dd < 10) dd = '0' + dd;
            if (mm < 10) mm = '0' + mm;

            const formattedToday = dd + '/' + mm + '/' + yyyy;
            return formattedToday;
}

const app = express();

// To call a value form .env file
// console.log(process.env.SECRET);

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    secret: "ourLittleSecret",
    resave: false,
    saveUninitialized: true,
    // cookie: { secure: true }
    }));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB")

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    attendance: [{
        date : String,
        time: String,
        att : String
    }]
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)

const User = new mongoose.model("User", userSchema)


passport.use(User.createStrategy());

passport.serializeUser(function(user, done){
    done(null, user.id)
});

passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
        done(err, user);
    });
});

app.get("/", function(req,res){
    res.render("login")
})

app.get("/admin", function(req,res){
    res.render("admin")
})


app.get("/login", function(req,res){
    res.render("login")
})

app.get("/register", function(req,res){
    res.render("register")
})

app.get("/apply-leave", function(req, res){
    User.findById({"_id": req.user.id}, function(err, foundUser){
        if(err){
            console.log(err);
        }
        else{
            if(foundUser){
                console.log(foundUser.id)
                res.render("base", {attendances: foundUser})
                // if(foundUser.attendance != null){
                //     res.render("base", {attendances: foundUser})
                // }
                // else{
                //     res.render("submit")
                // }
            }
        }
    })
})

app.get("/submit", function(req, res){
    if (req.isAuthenticated()){
        res.render("submit")
    }
    else{
        res.redirect("/login") 
    }
})

app.post("/submit", function(req, res){
    const submittedDate = req.body.date;
    const submittedTime = req.body.time;

    console.log(req.user.id);

    User.findById(req.user.id, function(err, foundUser){
        if(err){
            console.log(err);
        }
        else{
            // foundUser.attendance.date = submittedDate;
            // foundUser.attendance.date = submittedDate;
            // foundUser.attendance.att = "L";
            foundUser.attendance = [...foundUser.attendance, {date : submittedDate, time : submittedTime, att : "L"}]
            foundUser.save(function(){
                res.redirect("/submit")
            })
        }
    })
})

app.post("/adminSubmit", function(req, res){
    const rollNumber = req.body.att;
    const submittedTime = req.body.time;

    User.find({"username" : rollNumber}, function(err, foundUser){
        console.log(foundUser[0].attendance);

        if(err){
            console.log(err);
        }
        
        else{
            const formattedDate = getDate();
            foundUser[0].attendance = [...foundUser[0].attendance, {date : formattedDate, time : submittedTime, att : "P"}]
            foundUser[0].save(function(){
                res.redirect("/admin")
            })
        }
    })
})

app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
})

app.post("/register", function(req,res){

    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register")
        }
        else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/submit")
            })
        }
    })


    
})

app.post("/login", function(req, res){

    const user = new User({
        username: req.body.username,
        password: req.body.password
    })

    req.login(user, function(err){
        if(err){
            console.log(err);
        }
        else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/apply-leave")
            })
        }
    })

})


app.listen(3000, function(){
    console.log("Server started at port 3000");
})