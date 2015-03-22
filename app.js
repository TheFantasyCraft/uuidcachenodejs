var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mojang = require('mojang-api')
var NodeCache = require('node-cache')
domain = require('domain');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
d = domain.create();
d.on('error', function(err) {
  console.error(err);
});
// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var uuidcache = new NodeCache( { stdTTL: 3600, checkperiod: 60 } );
var namecache = new NodeCache( { stdTTL: 3600, checkperiod: 60 } );

uuidcache.on("del", function( key ){
  console.log(key + " uuid has expired, waiting for next login")
});


function updatecaches(name, uuid){
  uuidcache.set(name, uuid);
  namecache.set(uuid, name)
}

function getUUID(name, cb) {
  uuidcache.get(name, function(err, value){
    if (name in value && !err){
      cb({"name": name, "id": value[name], "cached": true})
    }else{
      mojang.uuidAt(name,function (err, out) {
        if (err)
          cb({"name":name, "id": null, "cached": false})
        else {
          updatecaches(out.name, out.id)
          cb({"name":name, "id": out.id, "cached": false})
        }
      });
    }

  })
}

function getName(uuid, cb){
  namecache.get(uuid, function(err, value){
    if (uuid in value ){
      cb({"name": value[uuid], "id": uuid, "cached": true})
    }else{
      mojang.profile(uuid, function(err,out){
        if  (err)
          cb({"name":null, "id": uuid, "cached": false})
        else{
          cb({"name": out.name, "id": uuid, "cached": false})
          updatecaches(out.name, out.id)
        }
      })
    }
  });
}

app.get('/uuid/:username', function(req, res, next) {
  getUUID(req.params.username, function(out) {
    res.json(out);
  });
});

app.get('/name/:uuid', function(req, res, next) {
  getName(req.params.uuid, function(out) {
    res.json(out);
  });
});

app.get('/', function(req, res, next) {
    res.json({"uuidcache":{"data":uuidcache.data,"stats":uuidcache.getStats()}, "namecache":{"data":namecache.data,"stats":namecache.getStats()}})
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
