var aws = require('./awsPricing/awsService')
const gcp = require("./gcpController")
let mapping = require(process.cwd() + '/mapping.json')

exports.getPricingInformation = (req, res, cb) => {

    let seriesData = mapping[req.body.activityId];
    aws.getAwsPricing(seriesData.aws, req.body.aws, (err, awsData) => {
        let gcpData = gcp.servicePriceJson(seriesData.gcp, req.body.gcp);
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

