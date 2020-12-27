var express = require("express")
var bodyParser = require("body-parser")
var mongoose = require("mongoose")
var methodoverride = require("method-override")
var app = express(),
    passport = require("passport"),
    localStrategy = require("passport-local"),
    localStrategyMongoose = require("passport-local-mongoose");
//var MongoClient = require("mongodb").MongoClient
var Blog = require("./models/blog.js")
var User = require("./models/User.js")
//dotenv
var dotenv = require('dotenv')
dotenv.config();

app.set("view engine", "ejs")
app.use(bodyParser.urlencoded({extended: true}))
app.use(methodoverride("_method"))
//app.use(bodyParser.json())
mongoose.set('useUnifiedTopology', true)
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, 'useFindAndModify': false})
//now, let's check whether we have connected or not
const db = mongoose.connection
db.once("open", () => {
    console.log("DATABASE CONNECTED! ")
})
db.on("error", err => {
    console.error(err)
})
//passport anau mynau
app.use(require("express-session")({
    secret: "My secret kotoruiu ya ne ponyal",
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get('/', function(req, res){
    Blog.find({}, function(err, allBlogs){
        if(err) console.error(err)
        else{
            res.render("home", {blogs: allBlogs, user: req.user})
        }
    })
})

app.get("/me", isLoggedIn, function(req, res){
    var user = req.user
    console.log(user)
    Blog.find({}, function(err, blogs){
        if(err){
            console.error(err)
            res.redirect("/")
        }else{
            let all = blogs.filter( (blog) => (blog.author.id.equals(req.user.id)))
            //console.log(all)
            res.render("blog", {blogs : all, user : req.user});
        }
    })
})

app.get("/login", alreadyLoggedIn, function(req, res){
    res.render("login", {user : null});
})

app.get("/signup", alreadyLoggedIn, function(req, res){
    res.render("signup", {user : null})
})

app.get("/logout", isLoggedIn, function(req, res){
    req.logout();
    res.redirect('/');
})

app.get("/blogs/:id", function(req, res){
    const id = req.params.id
    //console.log(id)
    Blog.findById(id, function(err, foundBlog){
        if(err) {
            console.error(err)
            res.redirect("/")
        }
        else{
            res.render('singleBlog', {blog: foundBlog, user: req.user});
        }
    })
})
app.get("/blogs/:id/edit", isLoggedIn, function(req, res){
    Blog.findById(req.params.id, function(err, foundBlog){
        if(err) console.error(err)
        else{
            if(foundBlog.author.id.equals(req.user._id)){
                res.render("edit", {blog: foundBlog})
            }else{
                console.log("You can't access the blog of another user!")
                res.redirect("back");
            }
        }
    })
})


app.get("/new", isLoggedIn, function(req, res){
    res.render('new', {user: req.user})
})


app.get('*', function(req, res){
    res.redirect("/")
})

//post requests
app.post("/", isLoggedIn, function(req, res){
    console.log("new post! here are the details")
    console.log(req.body)
    
    Blog.create({
        name: req.body.header,
        image: req.body.imageurl,
        description: req.body.description,
    }, function(err, newBlog){
        if(err) console.error(err)
        else{
            newBlog.author.id = req.user._id;
            newBlog.author.username = req.user.username;
            newBlog.save((err, document) => {
                if(err) console.error(err)
                console.log(document)
            })
            User.findById(req.user._id, function(err, foundUser){
                if(err){
                    console.log(err)
                    res.redirect("/")
                }else{
                    foundUser.blogs.push(newBlog._id)
                    foundUser.save((err, document) => {
                        if(err){
                            console.error(err)
                        }else{
                            console.log(document)
                        }
                    })
                    console.log("added a new blog to " + req.user.username)
                }
            })
            res.redirect("/")
        }
    })
})
app.put("/blogs/:id", isLoggedIn, function(req, res){
    const id = req.params.id
    Blog.findById(id, function(err, foundBlog){
        if(foundBlog.author.id.equals(req.user._id)){
            Blog.findByIdAndUpdate(id, req.body.blog, function(err, updatedBlog){
                if(err) console.error(err)
                else{
                    res.redirect("/blogs/"+req.params.id)
                }
            })
        }else{
            console.log("You can't acccess to this blog!!")
            res.redirect("back")
        }
    })
    
})
app.delete("/blogs/:id", isLoggedIn, function(req, res){
    var id = req.params.id
    Blog.findById(id, function(err, foundBlog){
        if(foundBlog.author.id.equals(req.user._id)){
            Blog.deleteOne({_id: req.params.id}, function(err, deletedBlog){
                if(err) console.error(err)
                else{
                    res.redirect("/");
                }
            })
        }else{
            console.log("You can't acccess to this blog!!")
            res.redirect("back")
        }
    })
    
})

//login, signup
app.post("/signup", function(req,res){
    var name = req.body.name
    var username = req.body.username
    var password = req.body.password
    var passwordRep = req.body.passwordRep
    if(!name || !username || !passwordRep || !password){
        res.send("PLease, fill all the blanks!")
    }
    else if(password != passwordRep){
        res.send("Your confirmation password doesn't match!")
    }else{
        User.findOne({username: username}, function(err, foundUser){
            if(err) console.error(err)
            else{
                console.log(foundUser)
                if(foundUser){
                    res.send("there exists a user with such username" + foundUser.name)
                }else{
                    var newUser = new User({name: name,
                                        username: username,
                                        blogs: []})
                    User.register(newUser, req.body.password, function(err, registeredUser){
                        if(err) console.error(err)
                        else{
                            passport.authenticate('local', { failureRedirect: '/login' })
                            res.redirect("/")
                        }
                    })
                }
            }
        })
    }
})

app.post('/login', 
  passport.authenticate('local', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
});


//    MIDDLEWARE
function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/login")
}
function alreadyLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return res.redirect("back")
    }
    return next()
}

app.listen(process.env.PORT || 3000, process.env.IP, function(){
    console.log('app is running properly!...')
})