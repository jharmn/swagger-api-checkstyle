var joiRegex  = require("../lib/joi_regex");
var Joi       = require("joi");
var _         = require("lodash");
var should    = require('should');

describe('joiRegex()', function(){
  it('should convert string into Joi regex', function() {
    regex = joiRegex('^abc$');
    regex.isJoi.should.be.true;
    regex._tests[0]['name'].should.eql('regex');
    regex._tests[0]['arg'].should.eql(/^abc$/);
  });

  it('should convert array into Joi regex array', function() {
    regex = joiRegex(['^abc$', '^123$']);
    _.isArray(regex).should.be.true;
    regex.should.be.true;
    regex._tests[0]['name'].should.eql('regex');
    regex._tests[0]['arg'].should.eql(/^abc$|^123$/);
  });

})
