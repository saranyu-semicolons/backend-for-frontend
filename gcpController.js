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
                        usageTypes = usageTypes.filter(elem=>{
                            return elem !== 'Preemptible';
                        })
                    }
                })
            }
        })   
    return usageTypes
}

const returnServiceRegions = (resourceFamily) =>{
    let serviceRegions = fs.readdirSync(`./GCP_DATA/skus/Compute-Engine/${resourceFamily}`); 
return serviceRegions
}

const filterServiceRegions = (resourceFamily,serviceRegion) =>{
    let serviceRegions = serviceRegion.filter((region=>{
        let resourceGroups = fs.readdirSync(`./GCP_DATA/skus/Compute-Engine/${resourceFamily}/${region}`);
        return resourceGroups.indexOf("CPU") !== -1 && resourceGroups.indexOf("RAM") !== -1
    }))
    return serviceRegions
}

const filterOperationSysLicenses = (resourceFamily,serviceRegion) =>{
    let availableOS = fs.readdirSync(`./GCP_DATA/skus/Compute-Engine/${resourceFamily}/${serviceRegion}`);
    return availableOS
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
const filterMachine = (machineSeries,jsonData,resourceType,usagetype,custom) =>{
     return jsonData = jsonData.filter((mac)=>{
        if(usagetype){
            if(custom){
                return ((mac.fileData.description.indexOf(`${machineSeries}`) != -1 && mac.fileData.description.indexOf(`Custom`) != -1 && mac.fileData.description.indexOf(`${resourceType}`) != -1 ) && mac.usage === usagetype)
            }else{
                return ((mac.fileData.description.indexOf(`${machineSeries}`) != -1 && mac.fileData.description.indexOf(`Custom`) == -1 && mac.fileData.description.indexOf(`${resourceType}`) != -1)  && mac.usage === usagetype)
            }
        }else{
            if(custom){
            return (mac.fileData.description.indexOf(machineSeries)!= -1 && mac.fileData.description.indexOf(`${resourceType}`) != -1 && mac.fileData.description.indexOf(`Custom`) != -1 )
            }else {
                return (mac.fileData.description.indexOf(machineSeries)!= -1 && mac.fileData.description.indexOf(`${resourceType}`) != -1 && mac.fileData.description.indexOf(`Custom`) == -1 )
            }
        }
    })
}
const calcuateMinimalPriceResource = (resourceData) => {
    
    resourceData = resourceData.filter(elem=>{
        return elem.usage !== 'Preemptible';
    })
    for (const obj of resourceData) {
        let startUsageAmount = obj.fileData.pricingInfo[0].pricingExpression.tieredRates[0].startUsageAmount
        let unitPrice = obj.fileData.pricingInfo[0].pricingExpression.tieredRates[0].unitPrice
        let nanos = unitPrice.nanos
        let totalPrice = startUsageAmount + (nanos/Math.pow(10,9))
        obj.totalPrice = totalPrice
    }
    
    let minValue = resourceData[0] !== 0 ? resourceData[0] : resourceData[1]
    for(let i=1;i<resourceData.length;i++){
            if(minValue.totalPrice > resourceData[i].totalPrice &&  resourceData[i].totalPrice !== 0){
                minValue = resourceData[i]
        }
    }
    return minValue
}

const calPerMonthPrice = (resourceData,durationInMonth) =>{
    let startUsageAmount = resourceData.fileData.pricingInfo[0].pricingExpression.tieredRates[0].startUsageAmount
    let unitPrice = resourceData.fileData.pricingInfo[0].pricingExpression.tieredRates[0].unitPrice
    let nanos = unitPrice.nanos
    return totalPrice = startUsageAmount + (nanos/Math.pow(10,9))*730*durationInMonth
}

const calPerMonthStoragePrice = (resourceData,durationInMonth,storageSize) =>{
    let startUsageAmount = resourceData.fileData.pricingInfo[0].pricingExpression.tieredRates[0].startUsageAmount
    let unitPrice = resourceData.fileData.pricingInfo[0].pricingExpression.tieredRates[0].unitPrice
    let nanos = unitPrice.nanos
    return totalPrice = startUsageAmount + (nanos/Math.pow(10,9))*durationInMonth*storageSize
}

exports.gcpServicePriceJson = (serviceSeries,gcpInput)=>{
    let servicePriceJsonArr = [];
    if(!gcpInput){
        serviceSeries.forEach((series)=>{
            let input =  {};
            input.series = series;
            servicePriceJsonArr.push(servicePriceJson(input))
        })
        let minPriceService = servicePriceJsonArr[0];
        if(servicePriceJsonArr.length>1){
            minPriceService = servicePriceJsonArr[0];
            for(let i = 1;i<servicePriceJsonArr.length;i++){
                if(minPriceService.totalPriceArray[0].totalPrice > servicePriceJsonArr[i].totalPriceArray[0].totalPrice){
                    minPriceService = servicePriceJsonArr[i]
                }
            }
        }else{
            minPriceService = servicePriceJsonArr[0];
        }
        return minPriceService;
    }else{
        return servicePriceJson(gcpInput)
    }
    
}
const servicePriceJson  = (gcpInput) =>{
    let series = gcpInput.series;
    let machine = gcpInput.machine ? gcpInput.machine : "";
    let region = gcpInput.machineRegion ? gcpInput.machineRegion : "";
    let OS  = gcpInput.os ? gcpInput.os  : "";
    let storage = gcpInput.storage ? gcpInput.storage : "";
    let usageType = gcpInput.usageType ? gcpInput.usageType : "";
    let custom = gcpInput.custom ? gcpInput.custom : "";
    let mchineObj = {};
    let mchineObjArr = []
    let machineSeries = "";
    let storageData;
    if(OS !== ""){
        filterOS(OS)
    }

    if(series.toUpperCase() === "E2"){
        machineSeries = "E2 "
    } else if(series.toUpperCase() ==="N2D"){
        machineSeries = "N2D "
    }else if(series.toUpperCase() ==="N2"){
        machineSeries = "N2 "
    }else if(series.toUpperCase() ==="C1"){
        machineSeries = "Compute optimized "
    }else if(series.toUpperCase() ==="M2"){
        machineSeries = "Memory-optimized "
    }else if(series.toUpperCase() ==="N1"){
        machineSeries = "N1 "
    }
    if(machine !== ""){
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
            machineSeries = "Compute optimized "
        }else if(mchineObj.machine.includes("m2")){
            machineSeries = "Memory-optimized "
        }else if(mchineObj.machine.includes("n1")){
            machineSeries = "N1 "
        }
    }else{
        MACHINES.forEach(sys =>{
            if(sys.series.trim().toLocaleUpperCase() === series.trim().toLocaleUpperCase()){
                mchineObjArr.push(sys);
            }
        })
    }
    let serverRegions = returnServiceRegions("Compute");
    serverRegions = filterServiceRegions("Compute",serverRegions)
    let cpuJsonData ;
    let ramJsonData ;
    let cpuResourceDataArr = [];
    let ramResourceDataArr = [];
    let cpuResource ;
    let ramResource ;
    let totalPriceArray = [];
    if(region == ""){
        for (const [index,region] of serverRegions.entries()) {
            cpuJsonData = readJsonForResource("Compute",region,"CPU");
            ramJsonData = readJsonForResource("Compute",region,"RAM");
            if(series.toLocaleUpperCase() === "N1"){
                cpuJsonData = [...cpuJsonData,...readJsonForResource("Compute",region,"N1Standard")]
                ramJsonData = [...ramJsonData,...readJsonForResource("Compute",region,"N1Standard")]
            }
            if(usageType === ""){
                if(cpuJsonData.length >0){
                    cpuJsonData = filterMachine(machineSeries,cpuJsonData,"Instance");
                    cpuResource = calcuateMinimalPriceResource(cpuJsonData);
                }
                if(ramJsonData.length >0){
                    ramJsonData = filterMachine(machineSeries,ramJsonData,"Ram");
                    ramResource = calcuateMinimalPriceResource(ramJsonData);
                }
            }else{
                if(custom !== ""){
                    cpuResource = filterMachine(machineSeries,cpuJsonData,"Instance",usageType,custom);
                    if(cpuJsonData.length >0){
                        cpuResource = cpuResource[0]
                    }else{
                        return "resource not available for this usage"
                    }
                    ramResource = filterMachine(machineSeries,ramJsonData,"Ram",usageType, custom);
                    if(ramJsonData.length >0){
                        ramResource = ramResource[0];
                    }else{
                        return "resource not available for this usage"
                    }
                } else {
                    cpuResource = filterMachine(machineSeries,cpuJsonData,"Instance",usageType);
                    if(cpuJsonData.length >0){
                        cpuResource = cpuResource[0]
                    }else{
                        return "resource not available for this usage"
                    }
                    ramResource = filterMachine(machineSeries,ramJsonData,"Ram",usageType);
                    if(ramJsonData.length >0){
                        ramResource = ramResource[0];
                    }else{
                        return "resource not available for this usage"
                    }
                }
            }
            ramResourceDataArr.push(ramResource);
            cpuResourceDataArr.push(cpuResource);
            cpuResource = calcuateMinimalPriceResource(cpuResourceDataArr);
            ramResource = calcuateMinimalPriceResource(ramResourceDataArr);
        }
        
    }else{
        cpuJsonData = readJsonForResource("Compute",region,"CPU");
        ramJsonData = readJsonForResource("Compute",region,"RAM");
        if(series.toLocaleUpperCase() === "N1"){
            cpuJsonData = [...cpuJsonData,...readJsonForResource("Compute",region,"N1Standard")]
            ramJsonData = [...ramJsonData,...readJsonForResource("Compute",region,"N1Standard")]
        }
        if(usageType === ""){
            cpuJsonData = filterMachine(machineSeries,cpuJsonData,"Instance");
            ramJsonData = filterMachine(machineSeries,ramJsonData,"Ram");
            cpuResource = calcuateMinimalPriceResource(cpuJsonData);
            ramResource = calcuateMinimalPriceResource(ramJsonData);
        }else{
            if(custom !== ""){
                cpuResource = filterMachine(machineSeries,cpuJsonData,"Instance",usageType,custom);
                if(cpuResource.length>0){
                    cpuResource = cpuResource[0]
                }else{
                    return "resource not available for this usage"
                }
                ramResource = filterMachine(machineSeries,ramJsonData,"Ram",usageType, custom);
                if(cpuResource.length>0){
                    ramResource = ramResource[0];
                }else{
                    return "resource not available for this usage"
                }
            } else {
                cpuResource = filterMachine(machineSeries,cpuJsonData,"Instance",usageType);
                    if(cpuResource.length>0){
                        cpuResource = cpuResource[0]
                    }else{
                        return "resource not available for this usage"
                    }                
                ramResource = filterMachine(machineSeries,ramJsonData,"Ram",usageType);
                    if(cpuResource.length>0){
                        ramResource = ramResource[0];
                    }else{
                        return "resource not available for this usage"
                    }
            }
        }
    }

    if(machine == "" && mchineObjArr.length > 0){
        mchineObjArr.forEach((mchineObj)=>{
            let {CPU,RAM} = mchineObj;
            let cpuPrice = calPerMonthPrice(cpuResource,1)
            let ramPrice = calPerMonthPrice(ramResource,1)
            mchineObj.totalPrice = ((CPU * cpuPrice )+(RAM * ramPrice));
        })
        mchineObj = mchineObjArr[0];
        for(let i=1;i<mchineObjArr.length;i++){
            if(mchineObj.totalPrice > mchineObjArr[i].totalPrice){
                mchineObj = mchineObjArr[i]
            }
        }
    }
    
    if(storage !== ""){
        storageData = filterStorage(storage)
    }else{
        let storageObj = {};
        storageObj.region = region ? region : cpuResource.fileData.serviceRegions[0];
        storageObj.usage = cpuResource.usage;
        storageObj.storageSize = 10;
        storageObj.type = "LocalSSD"
        storageData = filterStorage(storageObj)
    }
        let {CPU,RAM} = mchineObj;
        for(let i=1;i<=36;i++){
            let priceObj = {}
            let cpuPrice = calPerMonthPrice(cpuResource,i)
            let ramPrice = calPerMonthPrice(ramResource,i)
            priceObj.month = i;
            if(storageData){
                priceObj.totalPrice = ((CPU * cpuPrice )+(RAM * ramPrice)) + storageData.totalStoragePrice;
            }else{
                priceObj.totalPrice = ((CPU * cpuPrice )+(RAM * ramPrice));
            }
            totalPriceArray.push(priceObj)
        }

    let returnObj = {}
    returnObj.instanceType = mchineObj.series.toUpperCase();
    returnObj.machine = mchineObj.machine;
    returnObj.CPU = mchineObj.CPU
    returnObj.RAM = mchineObj.RAM;
    returnObj.region = cpuResource.fileData.serviceRegions
    returnObj.cpuPricingStrategy = cpuResource.usage
    returnObj.ramPricingStrategy = ramResource.usage
    returnObj.totalPriceArray = totalPriceArray;
    returnObj.metadata = {};
    returnObj.metadata.cpuUsageTypes = returnUsageTypes("Compute",cpuResource.fileData.serviceRegions[0],"CPU");
    returnObj.metadata.ramUsageTypes = returnUsageTypes("Compute",cpuResource.fileData.serviceRegions[0],"RAM");
    returnObj.metadata.machineAvailableSeries = returnMachineAvailableSeries(mchineObj.machine);
    returnObj.metadata.serviceRegions = serverRegions;
    //returnObj.metadata.availableOS = filterOperationSysLicenses("License","global");
    //returnObj.metadata.availableOSRegion = "global"
    returnObj.metadata.availableStorage = [{type:"LocalSSD",usage:["Commit1Yr","Commit3Yr","OnDemand"]},
    {type:"PDStandard",usage:["OnDemand"]},{type:"SSD",usage:["OnDemand"]}];
    if(storageData){
        returnObj.storageData = {};
        returnObj.storageData.usage =  storageData.usage;
        returnObj.storageData.description =  storageData.fileData.description;
        returnObj.storageData.serviceRegions =  storageData.fileData.serviceRegions;
        returnObj.storageData.storageSize = storageData.storageSize
        returnObj.storageData.totalStoragePrice = storageData.totalStoragePrice
    }
    return returnObj;
}


const costCalcution = () =>{

}

const filterOS = (OS) =>{
    let OSJsonData = {};
        OSJsonData = readJsonForResource("License","global",OS)
}

const filterStorage = (storage) =>{
    let region = storage.region ? storage.region : "asia-east1";
    let usage = storage.usage ? storage.usage : "Commit3Yr";
    let type = storage.type ? storage.type : "LocalSSD"
    let storageSize = storage.storageSize ? storage.storageSize : 10;
    let storageJsonData = {};
    let regionArr = [];
    let typeArr = ["LocalSSD","SSD","PDStandard"];
    let allstorageJsonData = [];
    if(region == ""){
        regionArr = returnServiceRegions("Storage");
        if(type == ""){
            regionArr.forEach(region =>{
                typeArr.forEach(type =>{
                    storageJsonData = readJsonForResource("Storage",region,type)
                    allstorageJsonData.push(storageJsonData)
                })
            })
        }else{
            regionArr.forEach(region =>{
                    storageJsonData = readJsonForResource("Storage",region,type)
                    allstorageJsonData.push(storageJsonData)
            })
        }
    }else{
        if(type == ""){
            typeArr.forEach(type =>{
                storageJsonData = readJsonForResource("Storage",region,type)
                allstorageJsonData.push(storageJsonData)
            })
        }else{
            storageJsonData = readJsonForResource("Storage",region,type) 
            allstorageJsonData.push(storageJsonData)
        }
    }
    allstorageJsonData =allstorageJsonData.filter(storageJsonData =>{
        return storageJsonData.length > 0 
    })
    let minimalStorageJson ;
    if(allstorageJsonData.length ===1){
        if(usage !==""){
            storageJsonData = allstorageJsonData[0];
            storageJsonData.forEach((storage) =>{
                if(storage.usage == usage){
                    minimalStorageJson = storage
                }   
            })
            minimalStorageJson.storageSize = storageSize;
            minimalStorageJson.totalStoragePrice = calPerMonthStoragePrice(minimalStorageJson,1,storageSize)
        }else{
            storageJsonData = allstorageJsonData[0];
            minimalStorageJson = calcuateMinimalPriceResource(storageJsonData);
            minimalStorageJson.storageSize = storageSize;
            minimalStorageJson.totalStoragePrice = calPerMonthStoragePrice(minimalStorageJson,1,storageSize)
        }   
    }
    return minimalStorageJson
}
