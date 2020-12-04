const fs = require("fs");
const MACHINES = require("./gcpConfig").MACHINES

const readJsonForResource =  (resourceFamily,serviceRegion,resourceGroup) =>{
    let serviceRegions = fs.readdirSync(`./GCP_DATA/skus/Compute-Engine/${resourceFamily}`);
    let fileDataArray = [];
    serviceRegions.forEach(region =>{
        if(region === serviceRegion){
            let resourceGroups = fs.readdirSync(`./GCP_DATA/skus/Compute-Engine/${resourceFamily}/${region}`);
            resourceGroups.forEach(resource =>{
                if(resource == resourceGroup){
                    let usageTypes = fs.readdirSync(`./GCP_DATA/skus/Compute-Engine/${resourceFamily}/${region}/${resource}`);
                    usageTypes.forEach(usage => {
                        let files = fs.readdirSync(`./GCP_DATA/skus/Compute-Engine/${resourceFamily}/${region}/${resource}/${usage}`)
                        files.forEach((file)=>{
                            let usageTypesObj = {};
                            usageTypesObj.usage = usage;
                            let fileData = fs.readFileSync(`./GCP_DATA/skus/Compute-Engine/${resourceFamily}/${region}/${resource}/${usage}/${file}`,'utf8')
                            usageTypesObj.fileData = JSON.parse(fileData);
                                fileDataArray.push(usageTypesObj);
                        })
                    })
                }
            })
        }
    })
return fileDataArray;
}

const returnUsageTypes = (resourceFamily,serviceRegion,resourceGroup) =>{
        let serviceRegions = fs.readdirSync(`./GCP_DATA/skus/Compute-Engine/${resourceFamily}`);
        let usageTypes = [];
        serviceRegions.forEach(region =>{
            if(region === serviceRegion){
                let resourceGroups = fs.readdirSync(`./GCP_DATA/skus/Compute-Engine/${resourceFamily}/${region}`);
                resourceGroups.forEach(resource =>{
                    if(resource == resourceGroup){
                        usageTypes = fs.readdirSync(`./GCP_DATA/skus/Compute-Engine/${resourceFamily}/${region}/${resource}`);
                    }
                })
            }
        })   
    return usageTypes
}

const returnMachineAvailableSeries = (machine) =>{
    let AvailableMachinesInseries = [];
    let machineSeries ="";
    if(machine.includes("e2")){
        machineSeries = "e2-"
    }else if(machine.includes("n2d")){
            machineSeries = "n2d-"
        }else if(machine.includes("n2")){
            machineSeries = "n2-"
        }else if(machine.includes("c1")){
            machineSeries = "c1-"
        }else if(machine.includes("m2")){
            machineSeries = "m2-"
        }else if(machine.includes("n1")){
            machineSeries = "n1-"
        }
    MACHINES.forEach(sys =>{
        if(sys.machine.indexOf(`${machineSeries}`) != -1){
            AvailableMachinesInseries.push(sys.machine)
        }
    })
    return AvailableMachinesInseries;
}
const filterMachine = (machineSeries,jsonData,usagetype,custom) =>{
     return jsonData = jsonData.filter((mac)=>{
        if(usagetype){
            if(custom){
                return ((mac.fileData.description.indexOf(`${machineSeries}`) != -1 && mac.fileData.description.indexOf(`Custom`) != -1 ) && mac.usage === usagetype)
            }else{
                return ((mac.fileData.description.indexOf(`${machineSeries}`) != -1 && mac.fileData.description.indexOf(`Custom`) == -1 ) && mac.usage === usagetype)
            }
        }else{
            if(custom){
            return (mac.fileData.description.indexOf(machineSeries)!= -1 && mac.fileData.description.indexOf(`Custom`) != -1 )
            }else {
                return (mac.fileData.description.indexOf(machineSeries)!= -1 && mac.fileData.description.indexOf(`Custom`) == -1 )
            }
        }
    })
}
const calcuateMinimalPriceResource = (resourceData) => {
    let pricingInfo = [];
    
    resourceData = resourceData.filter(elem=>{
        return elem.usage !== 'Preemptible';
    })
    for (const obj of resourceData) {
        let startUsageAmount = obj.fileData.pricingInfo[0].pricingExpression.tieredRates[0].startUsageAmount
        let unitPrice = obj.fileData.pricingInfo[0].pricingExpression.tieredRates[0].unitPrice
        let nanos = unitPrice.nanos
        let totalPrice = startUsageAmount + (nanos/Math.pow(10,9))
        pricingInfo.push(totalPrice)
    }
    let minValue = Math.min(...pricingInfo);
    let index =-1;
    for (const [ind,obj] of  resourceData.entries()) {
        let startUsageAmount = obj.fileData.pricingInfo[0].pricingExpression.tieredRates[0].startUsageAmount
        let unitPrice = obj.fileData.pricingInfo[0].pricingExpression.tieredRates[0].unitPrice
        let nanos = unitPrice.nanos
        let totalPrice = startUsageAmount + (nanos/Math.pow(10,9))
        if(totalPrice === minValue){
            index = ind;  
        }
    }    
    return resourceData[index];
}

const calPerMonthPrice = (resourceData,durationInMonth) =>{
    let startUsageAmount = resourceData.fileData.pricingInfo[0].pricingExpression.tieredRates[0].startUsageAmount
    let unitPrice = resourceData.fileData.pricingInfo[0].pricingExpression.tieredRates[0].unitPrice
    let nanos = unitPrice.nanos
    return totalPrice = startUsageAmount + (nanos/Math.pow(10,9))*730*durationInMonth
}

exports.servicePriceJson  = (req, res) =>{
    console.log(req.query)
    let machine = req.query.machine;
    let region = req.query.machineRegion;
    let OS  = req.query.os ? req.query.os  : "";
    let storage = req.query.storage ? req.query.storage : "";
    let usageType = req.query.usageType ? req.query.usageType : "";
    let custom = req.query.custom ? req.query.custom : "";
    let mchineObj = {};
    let machineSeries = "";
    MACHINES.forEach(sys =>{
        if(sys.machine === machine){
            mchineObj = sys;
        }
    })
    if(mchineObj.machine.includes("e2")){
        machineSeries = "E2 "
    }else if(mchineObj.machine.includes("n2d")){
        machineSeries = "N2D "
    }else if(mchineObj.machine.includes("n2")){
        machineSeries = "N2 "
    }else if(mchineObj.machine.includes("c1")){
        machineSeries = "C1 "
    }else if(mchineObj.machine.includes("m2")){
        machineSeries = "M2 "
    }else if(mchineObj.machine.includes("n1")){
        machineSeries = "N1 "
    }
    let {CPU,RAM} = mchineObj;
    let OSJsonData = {};
    let storageJsonData = {};
    let cpuJsonData = readJsonForResource("Compute",region,"CPU")
    let ramJsonData = readJsonForResource("Compute",region,"RAM")
    if(OS !== ""){
        OSJsonData = readJsonForResource("License","global",OS)
    }
    if(storage !== ""){
        storageJsonData = readJsonForResource("Storage",region,storage)
    }
    if(usageType === ""){
        cpuJsonData = filterMachine(machineSeries,cpuJsonData);
        ramJsonData = filterMachine(machineSeries,ramJsonData);
        cpuResource = calcuateMinimalPriceResource(cpuJsonData);
        ramResource = calcuateMinimalPriceResource(ramJsonData);
    }else{
        if(custom !== ""){
            cpuResource = filterMachine(machineSeries,cpuJsonData,usageType,custom);
            cpuResource = cpuResource[0]
            ramResource = filterMachine(machineSeries,ramJsonData,usageType, custom);
            ramResource = ramResource[0];
        } else {
            cpuResource = filterMachine(machineSeries,cpuJsonData,usageType);
            cpuResource = cpuResource[0]
            ramResource = filterMachine(machineSeries,ramJsonData,usageType);
            ramResource = ramResource[0];
        }
    }
    let totalPriceArray = [];
    for(let i=1;i<=36;i++){
        let priceObj = {}
        let cpuPrice = calPerMonthPrice(cpuResource,i)
        let ramPrice = calPerMonthPrice(ramResource,i)
        priceObj.month = i;
        priceObj.totalPrice = ((CPU * cpuPrice )+(RAM * ramPrice));
        totalPriceArray.push(priceObj)
    }
    let returnObj = {}
    returnObj.instanceType = machineSeries;
    returnObj.machine = machine;
    returnObj.CPU = CPU
    returnObj.RAM = RAM;
    returnObj.cpuPricingStrategy = cpuResource.usage
    returnObj.ramPricingStrategy = ramResource.usage
    returnObj.totalPriceArray = totalPriceArray;
    returnObj.metadata = {};
    returnObj.metadata.cpuUsageTypes = returnUsageTypes("Compute",region,"CPU");
    returnObj.metadata.RAMUsageTypes = returnUsageTypes("Compute",region,"CPU");
    returnObj.metadata.machineAvailableSeries = returnMachineAvailableSeries(machine)
    return returnObj;
}