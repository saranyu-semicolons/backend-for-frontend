
var express = require('express')
var router = express.Router()
var pricingService = require('./service')

router.get("/servicePriceJson", (req, res) => {
    let series = req.query.series || "a1";
    let os = req.query.os || "Linux";
    let region = req.query.region || "Asia Pacific (Mumbai)";
    pricingService.getPricingInformation({ series, os, region }, (err, response) => {
        res.status(200).json(response);
    });
})

module.exports = router;

