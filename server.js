const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');
const exphbs = require('express-handlebars');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const csurf = require('csurf');

// ======== express setup ========

const app = express();

app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'bool was taken',
  resave: false,
  saveUninitialized: true,
  maxAge: 600000,
  HttpOnly: true,
  secure: true,
  cookie: { secure: true }
}));

app.use(helmet());
app.use(express.urlencoded({ extended: false }));

app.use(csurf());

app.engine('handlebars', exphbs({defaultLayout: 'main'})); 
app.set('view engine', 'handlebars');

// ======== user middleware ========

app.use((req, res, next) => {
  if (!(req.session && req.session.userID)) {
    return next();
  }
  User.findById(req.session.userID, (err, user) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return next();
    }

    user.password = undefined;
    req.user = user;

    next();
  });
});

function loginRequired(req, res, next) {
  if (!req.user) {
    return res.redirect("/login");
  }
  next();
}

// ======== mongo setup ========

mongoose.connect('mongodb://localhost/test', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true
});

let User = mongoose.model("User", new mongoose.Schema({
  firstName: { type: String, required: false },
  lastName:  { type: String, required: false },
  userName:  { type: String, required: true, unique: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },
}));

// ======== profile paths ========

// registration
app.get('/register', (req, res) => {
  res.render('register', { csrfToken: req.csrfToken() });
});

app.post('/register', (req, res) => {
  let hash = bcrypt.hashSync(req.body.password, 14);
  req.body.password = hash;
  let user = new User(req.body);

  user.save((err) => {
    if (err) {
      let errorMsg = "Something bad happened! Please try again.";
      if (err.code === 11000) {
        errorMsg = "That email or username is already taken, please try another or login.";
      }
      return res.render('register', { error: error });
    }
    res.redirect("/dashboard");
  });
});

// logging in
app.get('/login', (req, res) => {
  res.render('login', { csrfToken: req.csrfToken() });
});

app.post('/login', (req, res) => {
  User.findOne({ userName: req.body.userName }, (err, user) => {
    if (!user || !bcrypt.compareSync(req.body.password, user.password)) {
      return res.render('login', { error: "Incorrect username or password."});
    }
    req.session.userID = user._id;
    res.redirect('/dashboard');
  })
});

// to do password reset / email verification

app.get('/dashboard', loginRequired, (req, res, next) => {
  let data = {};
  data.username = req.user.userName;
  data.email = req.user.email;
  res.render('dashboard', data);
});

// ======== lessons / tutorials ========

//app.get('/lesson/:id', (req, res) => {
//  lessonID = req.params.id;
//  res.render('lesson');
//});

app.get('/', (req, res) => {
  let data = {};
  data.header_test = "Hewwo uwu";
  data.paragraph_test = "cpu go brrrrrr";
  res.render('home', data);
});

app.listen(3000); 