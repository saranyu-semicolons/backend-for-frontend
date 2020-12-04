
var express = require('express')
var router = express.Router()
var pricingService = require('./service')
const gcp = require("./gcpController")

router.get("/servicePriceJsonGcp",gcp.servicePriceJson);

router.get("/servicePriceJson", (req, res) => {
    let series = req.query.series || "a1";
    let os = req.query.os || "Linux";
    let region = req.query.region || "Asia Pacific (Mumbai)";
    pricingService.getPricingInformation({ series, os, region,req,res}, (err, response) => {
        res.status(200).json(response);
    });
})

module.exports = router;

