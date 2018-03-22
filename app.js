////////////////////////////////////////////////////////////////////
// HTTPS
/* const https = require('https')
const fs = require('fs')
const options = {
    cert: fs.readFileSync('/etc/letsencrypt/live/aiko.ml/fullchain.pem'),
    key: fs.readFileSync('/etc/letsencrypt/live/aiko.ml/privkey.pem')
} */
////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////
// Email
const sendmail = require('sendmail')()
////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////
// MongoDB
var mongoose = require('mongoose')
var ObjectId = require('mongoose').Types.ObjectId
var crypto = require('crypto')
var schema = require('./schema.js')
var User = schema.userModel

mongoose.connect('mongodb://127.0.0.1/ic-date')
mongoose.connection.on('error', (e) => {
    console.log("An error occurred while connecting:")
    console.log(e)
    console.log("Please resolve.")
})
////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////
// Referrals
var Ref = schema.refModel

var makeRef = (code, cb) => {
    crypto.randomBytes(3, (e, b) => {
        if (e) cb(e, null)
        else Ref.findOne({
            code: code
        }, (e_, rr) => {
            let link = b.toString('hex')
            if (e_) cb(e_, null)
            else if (rr) cb(null, rr.link)
            else Ref.findOne({
                link: link
            }, (e2, ref) => {
                if (e2) cb(e2, null)
                else if (ref) makeRef(code, cb)
                else(new Ref({
                    code: code,
                    link: link,
                    count: 0
                })).save((err) => {
                    if (err) cb(err, null)
                    else cb(null, link)
                })
            })
        })
    })
}

var reffed = (link, cb) => {
    Ref.findOne({
        link: link
    }, (e, ref) => {
        if (e) cb(e)
        else if (ref) {
            ref.count = ref.count + 1
            ref.save((err) => {
                if (err) cb(err)
                else cb(null)
            })
        } else {
            cb("That's not a valid referral link.")
        }
    })
}

var getPos = (code, cb) => {
    Ref.findOne({
        code: code
    }, (e, ref) => {
        if (e) cb(e, null)
        else if (ref) Ref.find({
            count: {
                $gte: ref.count
            }
        }).count((e2, c) => {
            cb(e2, c)
        })
        else cb("Invalid email", null)
    })
}
////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////
// Express
var express = require('express')
app = express()

app.use(require('cors')())
app.use(require('helmet')())
app.use(require('express-htaccess-middleware')({
    file: require('path').resolve(__dirname, 'static/.htaccess'),
    verbose: true,
    watch: true
}))
app.use(require('compression')())

app.use('/', express.static(__dirname + '/static'))
////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////
// IC Peeps
var verifyPerson = (code, cb) => {
    crypto.randomBytes(3, (e, b) => {
        if (e) cb(null)
        else {
            let token = b.toString('hex')
            verifyEmail(code, token)
            cb(token)
        }
    })
}

var verifyEmail = (code, token) => {
    sendmail({
        from: 'no-reply@xn--gi8h6vaa.ws',
        to: `${code}@ic.ac.uk`,
        subject: 'Verify your Email Address for Pimperial',
        html: `Your special token is: <br /><br /><h1>${token}</h1>`,
    }, function (e, p) {
        console.log(e && e.stack)
        console.dir(p)
    })
}

var login = (code, cb) => {
    fetch(`http://cloud-vm-46-180.doc.ic.ac.uk:7022/search?code=${code}`)
        .then((s) => s.json())
        .then((d) => {
            if (d.err) cb(false)
            else User.findOne({
                code: code
            }, (e, s) => {
                if (e) cb(false)
                else if (s) cb(true)
                else(new User({
                    code: code,
                    name: d.name,
                    campus: d.campus,
                    student: d.student,
                    course: d.course
                })).save((e) => {
                    if (e) cb(false)
                    else cb(true)
                })
            })
        })
        .catch((e) => {
            console.log(e)
            cb(false)
        })
}

var info = (code, cb) => {
    User.findOne({
        code: code
    }, (e, s) => {
        if (e) cb(null)
        else if (s) cb({
            code: s.code,
            name: s.name,
            campus: s.campus,
            student: s.student,
            course: s.course
        })
        else cb(null)
    })
}
////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////
// Routes
//////////////////////////////////////
// Verification
app.all('/verify/:code', (q, s) => {
    verifyPerson(q.params.code, (c) => {
        if (c) s.send(c)
        else s.sendStatus(500)
    })
})
//////////////////////////////////////
//////////////////////////////////////
// Referrals
app.post('/getref', (q, s) => {
    let e = q.query.code
    makeRef(e, (err, link) => {
        if (err) s.sendStatus(500)
        else s.send(link)
    })
})
app.post('/getpos', (q, s) => {
    let e = q.query.code
    getPos(e, (err, count) => {
        if (err) s.sendStatus(500)
        else s.send("" + (count > 20 ? count + 20 : count))
    })
})
app.post('/ref/:link', (q, s) => {
    reffed(q.params.link, (e) => {
        if (e) s.sendStatus(500)
        else s.sendStatus(200)
    })
})
//////////////////////////////////////
////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////
// Start
let port = 3415
app.listen(port, () => console.log(`::${port}`))
// https.createServer(options, app).listen(443)
////////////////////////////////////////////////////////////////////