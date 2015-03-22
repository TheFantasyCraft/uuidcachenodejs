var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mojang = require('mojang-api')
var NodeCache = require('node-cache')

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var uuidcache = new NodeCache( { stdTTL: 3600, checkperiod: 60 } );
uuidcache.on("del", function( key ){
  console.log(key + " uuid has expired, waiting for next login")
});




function addCache(name, uuid){
  return uuid;
}

function get(name, cb) {
  var uuid = uuidcache.get(name, function(err, value){
    if (name in value && !err){
      cb({"name": name, "id": value[name], "cached": true})
    }else{
      var date = new Date();
      date.setMonth(0); // 0 = January
      mojang.uuidAt(name, date, function (err, out) {
        if (err)
          cb({"name":name, "id": null, "cached": false})
        else {
          uuidcache.set(name, out.id);
          cb({"name":name, "id": out.id, "cached": false})
        }
      });
    }

  })

}

app.get('/uuid/:username', function(req, res, next) {
  get(req.params.username, function(out) {
    res.json(out);
  });
});

app.get('/', function(req, res, next) {
    res.json(uuidcache.data)
});











// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
