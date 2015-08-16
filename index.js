var Promise = require("bluebird");
var fs      = Promise.promisifyAll(require("fs"));
var parser  = Promise.promisifyAll(require("swagger-parser"));
var yaml    = Promise.promisifyAll(require("js-yaml"));
var _       = Promise.promisifyAll(require("lodash"));
var mask    = require("json-mask");

var joiRegex = require("./joi_regex.js");
var Joi     = require("joi");

'use strict';

pathNamingConventions = {
  "spine-case": /^[\/a-z0-9\-]*$/g,
  "CAP-SPINE-CASE": /^[\/A-Z0-9\-]*$/g,
  "snake_case": /^[\/a-z0-9\_]*$/g,
  "camelCase": /^[\/a-z]+[\/A-Z0-9][\/a-z0-9]+[\/A-Za-z0-9]*$/g,
  "ProperCase": /^(\/[A-Z][a-z]*)+$/g
}

namingConventions = {
  "spine-case": /^[a-z0-9\-]*$/g,
  "CAP-SPINE-CASE": /^[A-Z0-9\-]*$/g,
  "snake_case": /^[a-z0-9\_]*$/g,
  "camelCase": /^[a-z]+[\/A-Z0-9][\/a-z0-9]+[\/A-Za-z0-9]*$/g,
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

function getSchema(checkStyle) {
  pathConvention = pathNamingConventions[checkStyle.paths.namingConvention];
  opIdConvention = namingConventions[checkStyle.paths.operationId.namingConvention];
  tagConvention= namingConventions[checkStyle.paths.tags.namingConvention];
  queryParamConvention = namingConventions[checkStyle.paths.parameters.query.namingConvention];
  headerParamConvention = namingConventions[checkStyle.paths.parameters.header.namingConvention];
  pathParamConvention = namingConventions[checkStyle.paths.parameters.path.namingConvention];
  statuses = new RegExp("^".concat(Object.keys(checkStyle.paths.status).join("$|^")).concat("$"));
  verbs = new RegExp("^".concat(checkStyle.paths.verbs.join("$|^")).concat("$"));

  parameterKeys = {
    'in': Joi.string().valid('query', 'header'),
    format: Joi.string(),
    type: Joi.string(),
    description: Joi.string(),
    required: Joi.boolean(),
    name: Joi.alternatives()
      .when('in', {is: 'query', then: Joi.string().regex(queryParamConvention)})
      .when('in', {is: 'header', then: Joi.string().regex(headerParamConvention)})
  }

  schema = Joi.object().keys({
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

function validate(checkStyleFile, specFile) {
  Promise.join(getSpecPromise(specFile), getCheckStylePromise(checkStyleFile), 
      function(spec, checkStyle) {
    return [spec, getSchema(checkStyle)];
  }).spread(function(spec, schema) {
    var result = Joi.validate(spec, schema);
    if (result.error) {
      console.log(result.error) 
    }
  });
}

checkStyle = './examples/uber/swagger-checkstyle.yaml';
spec = './examples/uber/swagger.yaml';

validate(checkStyle, spec);
