var aws = require('./awsPricing/awsService')
const gcp = require("./gcpController")

exports.getPricingInformation = (req, res, cb) => {
    aws.getAwsPricing(req.body.aws, (err, awsData) => {
        console.log("Final data ---",awsData);
        let gcpData = gcp.servicePriceJson(req.body.gcp, res);
        let consolidatedData = {
            totalPriceArray : {
                AWS : awsData.totalPriceArray,
                GCP : gcpData.totalPriceArray
            }
        }
        delete(awsData.totalPriceArray)
        delete(gcpData.totalPriceArray)
        consolidatedData.awsData = awsData;
        consolidatedData.gcpData = gcpData;
        cb(null, consolidatedData)
    });
}

