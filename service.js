var aws = require('./awsPricing/awsService')
const gcp = require("./gcpController")

exports.getPricingInformation = (inputArgs, cb) => {
    aws.getAwsPricing(inputArgs, (err, data) => {
        console.log("Final data ---",data);
        let consolidatedData = {}
        consolidatedData.awsData = data;
        consolidatedData.gcpData = gcp.servicePriceJson(inputArgs.req, inputArgs.res);
        cb(null, consolidatedData)
    });
}

