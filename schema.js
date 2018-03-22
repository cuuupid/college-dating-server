var mongoose = require('mongoose');

var UserSchema = new mongoose.Schema({
    code: String,
    name: String,
    campus: String,
    student: Boolean,
    course: String,
})

var ReferralSchema = new mongoose.Schema({
    code: String,
    link: String,
    count: Number
})

var User = mongoose.model('User', UserSchema)
var Referral = mongoose.model('Referral', ReferralSchema)

module.exports = {
    userModel: User,
    refModel: Referral
}