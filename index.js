var Promise = require("bluebird");
var fs      = Promise.promisifyAll(require("fs"));
var Joi     = Promise.promisifyAll(require("joi"));
var parser  = Promise.promisifyAll(require("swagger-parser"));
var yaml    = Promise.promisifyAll(require("js-yaml"));
var _       = Promise.promisifyAll(require("lodash"));
var mask    = require("json-mask");

var joiRegex = require("./joi_regex.js");

'use strict';

namingConventions = {
  "spine-case": /[^\/a-z0-9\-]*/g,
  "snake_case": /[^\/a-z0-9\_]*/g,
  "camelCase": /[\/a-z]+[\/A-Z0-9][\/a-z0-9]+[\/A-Za-z0-9]*$/g
  //"Train-Case": "[a-z0-9\-]*
}

function ValidationError(type, field) {
  this.type = type;
  this.field = field;
}

//Promise.onPossiblyUnhandledRejection(function(error){
//  throw error;
//});

function getSpecPromise(file) {
  return parser.parseAsync(file)
  .spread(function(api, metadata) {
    return api;
  }).catch(function(e) {
    console.error("unable to read swagger file\n"+e)
    process.exit(1);
  });
}

function getCheckStylePromise(file) {
  return fs.readFileAsync(file)
  .then(yaml.safeLoad)
  .catch(function(e) {
    console.error("unable to read checkstyle\n"+e)
    process.exit(1);
  });
}

function validatePath(path, pathNamingConvention) {
  matchPath = path.replace(pathNamingConvention, "") === path
  if (!matchPath) {
    return new ValidationError("path", path);
  } else {
    return null;
  }
}

function validateOperation(opId, opNamingConvention) {
  matchOp = opId.match(opNamingConvention);
  if (matchOp == null || matchOp[0] != opId) {
    return new ValidationError("operation", opId);
  } else {
    return null;
  }
}

function validateConventions(spec, pathNamingConvention, opNamingConvention) {
  var errors = new Array();

  result = mask(spec, "paths/*/*/operationId");
  paths = result.paths
  _.each(Object.keys(paths), function(path) {

    pathError = validatePath(path, pathNamingConvention);
    if (pathError != null) errors.push(pathError);

    pathValue = result.paths[path]
    _.each(Object.keys(pathValue), function(verb) {

      opId = pathValue[verb].operationId;
      opError = validateOperation(opId, opNamingConvention);
      if (opError != null) errors.push(opError);

    });
  });
  return errors;
}

function getSchema(checkStyle) {
  schema = Joi.object().keys({
    swagger: Joi.any().valid(checkStyle.swagger),
    host: joiRegex(checkStyle.host),
    scheme: joiRegex(checkStyle.schemes),
    basePath: joiRegex(checkStyle.basePath),
    paths: Joi.object().keys({

    })
    //produces: joiRegex(checkStyle.produces), //TODO: Array matching
  });

  return schema;
}

function validate(checkStyleFile, specFile) {
  specPromise = getSpecPromise(specFile);
  stylePromise = getCheckStylePromise(checkStyleFile);

  Promise.join(specPromise, stylePromise, function(spec, checkStyle) {
    pathConvention = namingConventions[checkStyle.paths.namingConvention];
    opIdConvention = namingConventions[checkStyle.paths.operationId.namingConvention];
    errors = validateConventions(spec, pathConvention, opIdConvention);
    console.log(errors);

    return [spec,
      getSchema(spec, checkStyle),
      {allowUnknown: true}];
  }).spread(function(spec, schema, options) {
    Joi.validateAsync(spec, schema, options)
    .then(function(result) {
      //console.log(result);
    }).catch(function(err) {
      console.log(err);
    }).error(function(err) {
      console.log(err);
    });
  });
}

checkStyle = './examples/uber/swagger-checkstyle.yaml';
spec = './examples/uber/swagger.yaml';

validate(checkStyle, spec);
