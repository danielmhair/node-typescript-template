import * as jwt from 'express-jwt';

exports = jwt({
  secret: new Buffer('XETbB_DcG410oS6xdsvMsBi8r5ggyqVlFWz8weCOF2h6-93Si2B8MGrkcVWt0vJ7', 'base64'),
  audience: 'gBgn6lUKsFLVhENnL4vhy9bwRiEEIDXw'
});
