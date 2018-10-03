const express=require("express");
const fs = require("fs");
const https = require("https");
const { spawn } = require("child_process");
const assert = require("assert");
const fetch = require("node-fetch");

const app = express();

let html = "<html><h1>hello</h1></html>";
app.get("/", (req, res) => {
  res.status = 200;
  res.end(html);
});

async function main () {
  let bashResult = await new Promise((resolve, reject) => {
    let certCreateBashScript = spawn("bash", ["certsetup"]);
    certCreateBashScript.stdout.pipe(process.stdout);
    certCreateBashScript.stderr.pipe(process.stderr);
    certCreateBashScript.on("exit", resolve);
  });

  console.log("cert create shell script exit>", bashResult);

  if (bashResult > 0) {
    return [new Error({bashResult: bashResult})];
  }
  
  let opts = { 
    key: await fs.promises.readFile("my.key"),
    cert: await fs.promises.readFile("cert.pem")
  };
  return [undefined, await https.createServer(opts, app).listen(2443)];
}

main().then(async ([err, listener]) => {
  if (err != undefined) {
    process.exit(1);
  }
  let ca = await fs.promises.readFile("cacert.pem");
  let opts = {
    method: 'GET',
    hostname: "localhost",
    port: listener.address().port,
    path: '/',
    ca: ca,
    agent: false
  };

  /* node client https */
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

  assert.deepStrictEqual(html, body);

  /* fetch client */
  let fetchAgent = new https.Agent({ ca: ca });
  let response = await fetch("https://localhost:2443", {
    agent: fetchAgent
  });
  let fetchHtml = await response.text();
  assert.deepStrictEqual(fetchHtml, html);

  /* now die */
  listener.close();
});
