var should = require("should");
var assert = require("assert");
var swaggerCheckStyle = require("../lib")

describe('validate', function(done) {
  it('should validate swagger', function(done) {
    checkStyle = './examples/uber/swagger-checkstyle.yaml';
    spec = './examples/uber/swagger.yaml';
    result = null;

    swaggerCheckStyle.validate(checkStyle, spec, function(result, err) {
      if (err) throw err;
      should.not.exist(result.error)
      done();
    });
  });
  it('should not validate bad swagger', function(done) {
    checkStyle = './examples/uber/swagger-checkstyle.yaml';
    spec = './examples/uber/swagger-errors.yaml';

    swaggerCheckStyle.validate(checkStyle, spec, function(result, err) {
      if (err) throw err;
      result.error.name.should.eql("ValidationError");
      done();
    });
  });
});
