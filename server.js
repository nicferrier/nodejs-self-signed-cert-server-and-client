const express=require("express");
const fs = require("fs");
const https = require("https");
const { spawn } = require("child_process");

const app = express();

app.get("/", (req, res) => {
  res.status = 200;
  res.end("<html><h1>hello</h1></html>");
});

async function main () {
  let bashResult = await new Promise((resolve, reject) => {
    let certCreateBashScript = spawn("bash", ["certsetup"]);
    certCreateBashScript.stdout.pipe(process.stdout);
    certCreateBashScript.stderr.pipe(process.stderr);
    certCreateBashScript.on("exit", resolve);
  });

  console.log("cert create shell script exit>", bashResult);
  
  let opts = { 
    key: await fs.promises.readFile("my.key"),
    cert: await fs.promises.readFile("cert.pem")
  };
  return await https.createServer(opts, app).listen(2443);
}

main().then(async listener => {
  let ca = await fs.promises.readFile("cacert.pem");
  let opts = {
    method: 'GET',
    hostname: "localhost",
    port: listener.address().port,
    path: '/',
    ca: ca,
    agent: false
  };

  let body = await new Promise((resolve, reject) => {
    https.request(opts, (response) => {
      let body = "";
      response.on("data", data => body = body + data);
      response.on("end", data => {
        if (data != undefined) body = body + data;
        resolve(body);
      });
    }).end();
  });
  console.log("body", body);
  listener.close();
});
