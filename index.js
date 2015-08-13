var Promise = require("bluebird");
var fs      = Promise.promisifyAll(require("fs"));
var parser  = Promise.promisifyAll(require("swagger-parser"));
var yaml    = Promise.promisifyAll(require("js-yaml"));
var _       = Promise.promisifyAll(require("lodash"));
var mask    = require("json-mask");

var joiRegex = require("./joi_regex.js");
var Joi     = require("joi");

'use strict';

namingConventions = {
  "spine-case": /[^\/a-z0-9\-]*/g,
  "CAP-SPINE-CASE": /[^\/A-Z0-9\-]*/g,
  "snake_case": /[^\/a-z0-9\_]*/g,
  "camelCase": /[\/a-z]+[\/A-Z0-9][\/a-z0-9]+[\/A-Za-z0-9]*$/g,
  "ProperCase": /^([A-Z][a-z]*)+$/g
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
  pathConvention = namingConventions[checkStyle.paths.namingConvention];
  opIdConvention = namingConventions[checkStyle.paths.operationId.namingConvention];
  tagConvention= namingConventions[checkStyle.paths.tags.namingConvention];
  queryParamConvention = namingConventions[checkStyle.paths.parameters.query.namingConvention];
  headerParamConvention = namingConventions[checkStyle.paths.parameters.header.namingConvention];
  pathParamConvention = namingConventions[checkStyle.paths.parameters.path.namingConvention];
  statuses = new RegExp("^".concat(Object.keys(checkStyle.paths.status).join("$|^")).concat("$"));

  schema = Joi.object().keys({
    swagger: Joi.any().valid(checkStyle.swagger),
    info: Joi.any(),
    host: joiRegex(checkStyle.host),
    scheme: joiRegex(checkStyle.schemes),
    basePath: joiRegex(checkStyle.basePath),
    produces: Joi.array().items(joiRegex(checkStyle.produces)),
    consumes: Joi.array().items(joiRegex(checkStyle.consumes)),
    schemes: Joi.array().items(joiRegex(checkStyle.schemes)),
    paths: Joi.object() .pattern(pathConvention, Joi.object().keys({})
    // TODO: pull list of verbs into regexp
    .pattern(new RegExp("get"), Joi.object().keys({
      summary: Joi.any(),
      description: Joi.any(),
      parameters: Joi.any(),
      operationId: joiRegex(opIdConvention),
      tags: Joi.array().items(joiRegex(tagConvention)),
      responses: Joi.object()
        .pattern(statuses, Joi.object().keys({
          description: Joi.any(),
          schema: Joi.any()
        })
      )
    }))),
    parameters: Joi.object().pattern(queryParamConvention, Joi.object().keys({
      name: Joi.string(),
      'in': Joi.string().insensitive().regex(/^query$/),
      type: Joi.string(),
      format: Joi.string(),
      description: Joi.string()
    })).pattern(pathParamConvention, Joi.object().keys({
      name: Joi.string(),
      'in': Joi.string().insensitive().regex(/^path/),
      type: Joi.string(),
      format: Joi.string(),
      description: Joi.string()
    })),
    definitions: Joi.any()

  });

  return schema;
}

function validate(checkStyleFile, specFile) {
  Promise.join(getSpecPromise(specFile), getCheckStylePromise(checkStyleFile), 
               function(spec, checkStyle) {
    pathConvention = namingConventions[checkStyle.paths.namingConvention];
    opIdConvention = namingConventions[checkStyle.paths.operationId.namingConvention];
    errors = validateConventions(spec, pathConvention, opIdConvention);
    console.log(errors)

    return [spec,
      getSchema(checkStyle),
      {}];//{allowUnknown: true}];
  }).spread(function(spec, schema, options) {
    var result = Joi.validate(spec, schema, options);
    if (result.error) {
      console.log(result.error) 
    }
  });
}

checkStyle = './examples/uber/swagger-checkstyle.yaml';
spec = './examples/uber/swagger.yaml';

validate(checkStyle, spec);
