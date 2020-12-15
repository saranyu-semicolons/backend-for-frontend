function randomString(length, chars) {
  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}


/** code to provsion a GCP resource using Google APIs */
exports.gcp = async function (
  req, res, cb
  // VM name of your choice
) {
  // [START gce_create_vm]
  // console.log(req.body);
  // const machine = req.body.machine;
  // const region = req.body.region[0];

  var rString = randomString(8, '0123456789abcdefghijklmnopqrstuvwxyz');
  let vmName = `new-virtual-machine-${rString}`;
  const Compute = require('@google-cloud/compute');
  const compute = new Compute();
  console.log(`${req.body.region[0]}-a`)
  const zone = compute.zone(`${req.body.region[0]}-a`);
  // const machineType = zone.machineType(req.body.machine);
  // console.log("MachineType", req.body.machine, machineType);
  
  async function createVM() {
    // TODO(developer): provide a name for your VM
    // const vmName = 'new-virutal-machine';
    const [vm, operation] = await zone.createVM(vmName, {os: 'ubuntu', machineType: req.body.machine});
    console.log(vm);
    await operation.promise();
    console.log('Virtual machine created!');
    cb(false, {msg:`Virtual machine created! with name:${vmName}, region: ${req.body.region[0]},machine type: ${req.body.machine}`});
  }
  // cb(false, {msg:`Virtual machine created! with name:${vmName}, region: ${req.body.region[0]},machine type: ${req.body.machine}`});
  createVM();
  // [END gce_create_vm]
 
}

async function aws() {
  // Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
// Load credentials and set region from JSON file
AWS.config.update({region: 'ap-south-1'});

// Create EC2 service object
var ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

// AMI is amzn-ami-2011.09.1.x86_64-ebs
var instanceParams = {
   ImageId: 'my-sample', 
   InstanceType: 't2.micro',
   KeyName: 'KEY_PAIR_NAME',
   MinCount: 1,
   MaxCount: 1
};

// Create a promise on an EC2 service object
var instancePromise = new AWS.EC2({apiVersion: '2016-11-15'}).runInstances(instanceParams).promise();

// Handle promise's fulfilled/rejected states
instancePromise.then(
  function(data) {
    console.log(data);
    var instanceId = data.Instances[0].InstanceId;
    console.log("Created instance", instanceId);
    // Add tags to the instance
    tagParams = {Resources: [instanceId], Tags: [
       {
          Key: 'Name',
          Value: 'SDK Sample'
       }
    ]};
    // Create a promise on an EC2 service object
    var tagPromise = new AWS.EC2({apiVersion: '2016-11-15'}).createTags(tagParams).promise();
    // Handle promise's fulfilled/rejected states
    tagPromise.then(
      function(data) {
        console.log("Instance tagged");
      }).catch(
        function(err) {
        console.error(err, err.stack);
      });
  }).catch(
    function(err) {
    console.error(err, err.stack);
  });

}
// main(...process.argv.slice(2));
//aws();
