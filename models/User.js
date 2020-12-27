var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose")


var userShema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    username: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String, 
    },
    blogs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Blog"
    }]
})

userShema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userShema);