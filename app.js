const express = require("express");
const cors = require("cors");
const route = require("./route");
const app = express();

app.use(cors());
app.use(express.json({limit: '5mb'}));
app.use(express.urlencoded({limit: '5mb', extended: true}));
app.use("/",route);
let port = 3000;

app.listen(port,()=>{
     console.log("server started on port:- "+ port)
})