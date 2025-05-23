var app = require("./app");
var config = require("./config");
const { logger } = require("./logger");
logger.info(`App is ready ${config.app.port}`);

app.listen(config.app.port);