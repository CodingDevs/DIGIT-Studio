var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var config = require("./config");
var pdfRouter = require("./routes/studio-pdf")




// var {listenConsumer} = require("./consumer")



var app = express();
app.disable('x-powered-by');

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
console.log(`App Running in port ${config.app.port} with contextPath ${config.app.contextPath}`)
app.use(config.app.contextPath + "/public-service/download", pdfRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  logger.error(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  next(createError(404, "Route not found"));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});
// Commenting consumer listener becuase excel bill gen is not required. IFMS adapter will process the payment.
// listenConsumer();
module.exports = app;
