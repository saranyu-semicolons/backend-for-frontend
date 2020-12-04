var AWS = require('aws-sdk');
var fs = require('fs');
const path = require('path');
var creds = new AWS.FileSystemCredentials(path.join(__dirname, '/awsConfig.json'));
var pricing = new AWS.Pricing({ credentials: creds, region: "us-east-1" });
var _this = this;

const dataFolder = "data";
const servicesFolder = `${dataFolder}/awsServices`;

const createFolder = folderPath => {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }
}

const removeFolder = folderPath => {
    if (fs.existsSync(folderPath)) {
        fs.rmdirSync(folderPath, { recursive: true });
    }
}

const getCosting = (jsonFile, region, os) => {

    let monthlyPrices = {};
    
    if (fs.existsSync(`${servicesFolder}/${region}/${os}/${jsonFile}.json`)) {
        let fileContent = fs.readFileSync(`${servicesFolder}/${region}/${os}/${jsonFile}.json`);
        let product = JSON.parse(fileContent.toString())
        let onDemandPriceObj = product.terms.OnDemand;
        for (let offerCode in onDemandPriceObj) {
            let priceDimensionsObj = onDemandPriceObj[offerCode].priceDimensions;
            for (let rateCode in priceDimensionsObj) {
                let unit = priceDimensionsObj[rateCode].unit;
                let pricePerUnit = Number(priceDimensionsObj[rateCode].pricePerUnit.USD);
                if (unit == "Hrs") {
                    monthlyPrices['onDemand'] = (pricePerUnit * 730).toFixed(2);        //Avg hours per month is 730
                }
            }
        }

        let reservedPriceObject = product.terms.Reserved;
        monthlyPrices['reserved'] = {};
        for (let offerCode in reservedPriceObject) {
            let priceDimensionsObj = reservedPriceObject[offerCode].priceDimensions;
            let termAttributes = reservedPriceObject[offerCode].termAttributes;
            let pricingStrategy = `${termAttributes.OfferingClass}_${termAttributes.LeaseContractLength}_${termAttributes.PurchaseOption}`.replace(' ', '').toLowerCase();
            //console.log(pricingStrategy);
            monthlyPrices['reserved'][pricingStrategy] = {
                monthly: 0,
                upfront: 0
            }
            for (let rateCode in priceDimensionsObj) {
                let unit = priceDimensionsObj[rateCode].unit;
                let pricePerUnit = Number(priceDimensionsObj[rateCode].pricePerUnit.USD);
                if (unit == "Hrs") {
                    //console.log(Number(pricePerUnit));
                    //monthlyPrices['onDemand'] = monthlyPrices['onDemand'] + (pricePerUnit * 730);        //Avg hours per month is 730
                    monthlyPrices['reserved'][pricingStrategy]['monthly'] += (pricePerUnit * 730).toFixed(2);
                } else if (unit == "Quantity") {
                    monthlyPrices['reserved'][pricingStrategy]['upfront'] = pricePerUnit;
                }
            }

        }
    }
    return monthlyPrices;
}

const getAllAttributes = async (filter) => {
    const allAttributes = [];
    const params = {
        AttributeName: "instanceType",
        ServiceCode: "AmazonEC2",
    };

    const getAttrs = async (token) => {
        if(token) {
            params.NextToken = token;
        }

        return pricing.getAttributeValues(params).promise()
            .then(data => {
                allAttributes.push(...data.AttributeValues);
                if(data.NextToken){
                    return getAttrs(data.NextToken);
                }

                let filteredAttrs = allAttributes.filter((attr) => attr.Value.startsWith(filter))
                return filteredAttrs;
            })
            .catch(err => {
                console.log(err);
                throw new Error('Error getting all attributes');
            })
    }
    return getAttrs();
}

const getProductPricing = async (instanceType, region, os) => {
    const params = {
        Filters: [
            {
                "Type": "TERM_MATCH",
                "Field": "location",
                "Value": region
            }, {
                "Type": "TERM_MATCH",
                "Field": "instanceType",
                "Value": instanceType
            }, {
                "Type": "TERM_MATCH",
                "Field": "operatingSystem",
                "Value": os
            }, {
                "Type": "TERM_MATCH",
                "Field": "tenancy",
                "Value": "Shared"
            }, {
                "Type": "TERM_MATCH",
                "Field": "capacitystatus",
                "Value": "Used"
            }, {
                "Type": "TERM_MATCH",
                "Field": "preInstalledSw",
                "Value": "NA"
            }
        ],
        ServiceCode: "AmazonEC2"
    };

    let regionFolder = `${servicesFolder}/${region}`;
    let osFolder = `${regionFolder}/${os}`;

    createFolder(dataFolder);
    createFolder(servicesFolder);
    createFolder(regionFolder);
    createFolder(osFolder);

    const getProducts = async (token) => {
        if (token) {
            params.NextToken = token;
        }

        return pricing.getProducts(params).promise()
            .then((data) => {
                if (data) {
                    if (data.PriceList.length > 0) {
                        if (!fs.existsSync(`${osFolder}/${instanceType}.json`)) {
                            const fsStream = fs.createWriteStream(`${osFolder}/${instanceType}.json`, { flags: 'a' })
                            fsStream.write(JSON.stringify(...data.PriceList))
                        }
                    }

                    if (data.NextToken) {
                        getProducts(data.NextToken);
                    }
                }
            })
            .catch(err => {
                console.log(err);
                throw new Error(`Error getting ${instanceType} product information`);
            })
    }

    getProducts();
}

exports.getAwsPricing = async (inputArgs, cb) => {
    //get Series types
    const allInstancePricingValues = {};
    let cheapestAnnualPricingStrategy = {};
    cheapestAnnualPricingStrategy['annualCost'] = 99999999999;
    getAllAttributes(inputArgs.series).then(instanceTypes => {
        let promiseArray = []
        instanceTypes.forEach((instanceType) => {
            //Get Price Information
            promiseArray.push(getProductPricing(instanceType.Value, inputArgs.region, inputArgs.os))
        })

        Promise.all(promiseArray).then(() => {
            instanceTypes.forEach((instanceType) => {
                allInstancePricingValues[instanceType.Value] = getCosting(instanceType.Value, inputArgs.region, inputArgs.os)
            })

            //Identify lowest
            for(let instance in allInstancePricingValues){
                let monthlyPricingObject = allInstancePricingValues[instance];

                for(let ps in monthlyPricingObject){
                    let annualCost, monthlyCost, upfrontCost;
                    switch(ps){
                        
                        case "onDemand":
                            annualCost = Number((Number(monthlyPricingObject[ps])*12).toFixed(2));
                            if(annualCost < cheapestAnnualPricingStrategy['annualCost']){
                                let tempObject = {
                                    annualCost: annualCost,
                                    monthly: Number(monthlyPricingObject[ps]),
                                    instanceType: instance,
                                    pricingStrategy: "On Demand"
                                }
                                cheapestAnnualPricingStrategy = tempObject;
                            }
                            break;
                        case "reserved":
                            for(let rps in monthlyPricingObject[ps]){
                                
                                monthlyCost = Number(monthlyPricingObject[ps][rps]['monthly']) * 12;
                                upfrontCost = Number(monthlyPricingObject[ps][rps]['upfront']);
                                annualCost = Number((monthlyCost + upfrontCost).toFixed(2));
                                let psDetails = rps.split('_')
                                if(annualCost < cheapestAnnualPricingStrategy['annualCost']){
                                    let tempObject = {
                                        annualCost: annualCost,
                                        monthly: Number(monthlyPricingObject[ps][rps]['monthly']),
                                        upfront: Number(monthlyPricingObject[ps][rps]['upfront']),
                                        instanceType: instance,
                                        pricingStrategy: `Reserved ${psDetails[0]}`,
                                        reservationTerm: psDetails[1],
                                        paymentType: psDetails[2]

                                    }
                                    cheapestAnnualPricingStrategy = tempObject;
                                }
                            }
                            break;
                    }
                }
            }
            //Return array and current object
            let priceArray = []
            
            for(let i=1; i<=36; i++){
                priceArray.push({month:i, totalPrice: Number((cheapestAnnualPricingStrategy.monthly * i).toFixed(2))})
            }
            // if(cheapestAnnualPricingStrategy.pricingStrategy == "On Demand"){
                
            // }
            // else {
            //     if(cheapestAnnualPricingStrategy.reservationTerm == "1yr"){

            //     }else if(cheapestAnnualPricingStrategy.reservationTerm == "3yr"){

            //     }
            // }

            cheapestAnnualPricingStrategy['totalPriceArray'] = priceArray;
            cheapestAnnualPricingStrategy['metadata'] = {
                instanceTypes : instanceTypes.map((ins) => ins.Value),
                pricingStrategies : ["On Demand","Reserved Standard","Reserved Convertible"]
            }
            cb(null,cheapestAnnualPricingStrategy)

        }).catch(err => {
            console.log(err.message);
        })
    })
}


