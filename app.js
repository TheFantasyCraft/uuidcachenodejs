var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mojang = require('mojang-api')
domain = require('domain');
var request = require('request');

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

var uuids = {};

function getUUID(name, cb) {
  if (uuids[name]){
    if (((getTime() - uuids[name].updated) / 36e5) > 6)
      getnewUUID(name, cb)
    else
      cb(uuids[name].id, true)
  }
  else{
    getnewUUID(name, cb)
  }
}

function getnewUUID(name, cb){
  if (name.indexOf("[") > -1)
    cb("41c82c877afb4024ba5713d2c99cae77")

  mojang.uuidAt(name,function (err, out) {
    if (!err) {
      if (uuids[name])
        cb(uuids[name].id, true)
      else
        getfallback(name, cb, "uuid");
    }
    else {
      uuids[name]={"updated":getTime(), "id":out.id}
      cb(uuids[name].id, false)
    }

  })
}

function getfallback(uuidorname, cb, key) {
  request("http://mcuuid.com/api/" + uuidorname + "/raw", function (error, response, body) {
    if (!error && response.statusCode == 200) {
      keyvalue = body;
      cb(keyvalue, false);
      if (key == "name")
        uuids[keyvalue]={"updated":getTime(), "id":uuidorname}
      else
        uuids[uuidorname]={"updated":getTime(), "id":keyvalue}
      console.log("mojang blocked us, fallback using mcuuid.net")
    }
    else{
      console.log(error)
      cb(null, false)
    }
  });
}

function getName(uuid, cb){

  for (key in uuids){
    console.log(key)
    if (uuid == uuids[key].id){
      cb(key, true);
      return;
    }
  }
  mojang.profile(uuid,function (err, out) {
    if (err) {
      getfallback(uuid, cb, "name");
    }
    else {
      uuids[out.name]={"updated":getTime(), "id":uuid}
      cb(out.name, false)
    }
  });
}

function getTime(){
  return new Date().getTime()
}

app.get('/uuid/:username', function(req, res, next) {
  getUUID(req.params.username, function(uuid, cache) {
    res.json({"name":req.params.username, "id":uuid, "cached":cache});
  });
});

app.get('/name/:uuid', function(req, res, next) {
  getName(req.params.uuid, function(out,cache) {
    res.json({"name":out, "id":req.params.uuid, "cached":cache});
  });
});

app.get('/', function(req, res, next) {
    res.json(uuids)
});

app.get('/clear', function(req, res, next) {
  uuids = [];
  res.json({"status":"cleared"})
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
