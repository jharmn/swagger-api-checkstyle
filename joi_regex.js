var _       = require("lodash");
var Joi     = require("joi");
var exports = module.exports = {};

module.exports = function(any) {
  if (_.isArray(any)) {
    result = '';
    _.each(any, function(item) {
      result += "|" + item;
    });
    return Joi.string().regex(new RegExp(result.substring(1)));
  } else {
    return Joi.string().regex(new RegExp(any));
  }
}

