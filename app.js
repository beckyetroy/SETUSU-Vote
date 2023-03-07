var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var adminRouter = require('./routes/admin_interface');
var candidateRouter = require('./routes/candidate_interface');
var registerRouter = require('./routes/register');
var voteRouter = require('./routes/vote');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));
app.use('/', indexRouter);
app.use('/register', registerRouter);
app.use('/vote', voteRouter);
app.use('/hj9h8765qzf5jizwwnua', adminRouter);
app.use('/hj9h', candidateRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
  //res.redirect('/');
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
