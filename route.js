
var express = require('express')
var router = express.Router()
var pricingService = require('./service')
const gcp = require("./gcpController")

router.post("/servicePriceJson", (req, res) => {
    pricingService.getPricingInformation(req, res, (err, response) => {
        if(err) {
            console.log(err);
            res.status(400).send(err.message);
        }
        res.status(200).json(response);
    });
})

module.exports = router;

