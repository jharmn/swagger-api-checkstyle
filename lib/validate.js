'use strict';

module.exports = validate;

var joiRegex = require('./joi_regex');
var conventions = require('./conventions');

var Joi     = require("joi");
var Promise = require("bluebird");
var fs      = Promise.promisifyAll(require("fs"));
var parser  = Promise.promisifyAll(require("swagger-parser"));
var yaml    = Promise.promisifyAll(require("js-yaml"));
var _       = Promise.promisifyAll(require("lodash"));


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

function getSchema(checkStyle) {
  var pathConvention = conventions.path[checkStyle.paths.namingConvention];
  var opIdConvention = conventions.naming[checkStyle.paths.operationId.namingConvention];
  var tagConvention= conventions.naming[checkStyle.paths.tags.namingConvention];
  var queryParamConvention = conventions.naming[checkStyle.paths.parameters.query.namingConvention];
  var headerParamConvention = conventions.naming[checkStyle.paths.parameters.header.namingConvention];
  var pathParamConvention = conventions.naming[checkStyle.paths.parameters.path.namingConvention];
  var statuses = new RegExp("^".concat(Object.keys(checkStyle.paths.status).join("$|^")).concat("$"));
  var verbs = new RegExp("^".concat(checkStyle.paths.verbs.join("$|^")).concat("$"));

  var parameterKeys = {
    'in': Joi.string().valid('query', 'header'),
    format: Joi.string(),
    type: Joi.string(),
    description: Joi.string(),
    required: Joi.boolean(),
    name: Joi.alternatives()
      .when('in', {is: 'query', then: Joi.string().regex(queryParamConvention)})
      .when('in', {is: 'header', then: Joi.string().regex(headerParamConvention)})
  }

  var schema = Joi.object().keys({
    swagger: Joi.any().valid(checkStyle.swagger),
    info: Joi.object().keys({
      title: Joi.string(),
      description: Joi.string(),
      version: Joi.string()
    }),
    host: joiRegex(checkStyle.host),
    scheme: joiRegex(checkStyle.schemes),
    basePath: joiRegex(checkStyle.basePath),
    produces: Joi.array().items(joiRegex(checkStyle.produces)),
    consumes: Joi.array().items(joiRegex(checkStyle.consumes)),
    schemes: Joi.array().items(joiRegex(checkStyle.schemes)),
    paths: Joi.object().pattern(pathConvention,
      Joi.object().pattern(verbs, Joi.object().keys({
        summary: Joi.any(),
        description: Joi.any(),
        parameters: Joi.array()
          .items(Joi.object().keys(parameterKeys)),
        operationId: joiRegex(opIdConvention),
        tags: Joi.array().items(joiRegex(tagConvention)),
        responses: Joi.object().pattern(statuses, Joi.object().keys({
          description: Joi.any(),
          schema: Joi.any()
        }))
      }))
    ),
    parameters: Joi.object().pattern(/.*/, Joi.object().keys(parameterKeys)),
    definitions: Joi.any()
  });

  return schema;
}

function validate(checkStyleFile, specFile, callback) {
  Promise.join(getSpecPromise(specFile), getCheckStylePromise(checkStyleFile), callback,
      function(spec, checkStyle, callback) {
    return [spec, getSchema(checkStyle), callback];
  }).spread(function(spec, schema, callback) {
    return Joi.validate(spec, schema);
  }).then(function(result) {
    callback(result, null);
  }).catch(function(e) {
    callback(null, e);
  });
}
