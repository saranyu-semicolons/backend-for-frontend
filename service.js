var aws = require('./awsPricing/awsService')

exports.getPricingInformation = (inputArgs, cb) => {
    aws.getAwsPricing(inputArgs, (err, data) => {
        console.log("Final data ---",data); 
        cb(null, data)
    });
}

