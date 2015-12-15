'use strict';

var exports = module.exports = {};

exports.path = {
  "spine-case": /^[\/a-z0-9\{\}\-]*$/g,
  "CAP-SPINE-CASE": /^[\/A-Z0-9\-]*$/g,
  "snake_case": /^[\/a-z0-9\_]*$/g,
  "camelCase": /^[\/a-z]+[\/A-Z0-9][\/a-z0-9]+[\/A-Za-z0-9]*$/g,
  "ProperCase": /^(\/[A-Z][a-z]*)+$/g
};

exports.naming = {
  "spine-case": /^[a-z0-9\-]*$/g,
  "CAP-SPINE-CASE": /^[A-Z0-9\-]*$/g,
  "snake_case": /^[a-z0-9\_]*$/g,
  "camelCase": /^[a-z]+[\/A-Z0-9][\/a-z0-9]+[\/A-Za-z0-9]*$/g,
  "ProperCase": /^([A-Z][a-z]*)+$/g
  //"Train-Case": "[a-z0-9\-]*
};
