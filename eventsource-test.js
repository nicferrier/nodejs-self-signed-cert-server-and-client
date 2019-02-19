const EventSource = require("eventsource");
const https = require("https");
const { spawn } = require("child_process");
const fs = require("fs");

const testit = async function () {
    const certBashResult = await new Promise((resolve, reject) => {
        let certCreateBashScript = spawn("bash", ["certsetup"]);
        certCreateBashScript.stdout.pipe(process.stdout);
        certCreateBashScript.stderr.pipe(process.stderr);
        certCreateBashScript.on("exit", resolve);
    });

    console.log("cert create shell script exit>", certBashResult);
    
    if (certBashResult > 0) {
        return [new Error({bashResult: certBashResult})];
    }
  
    const opts = { 
        key: await fs.promises.readFile("my.key"),
        cert: await fs.promises.readFile("cert.pem")
    };
    const port = 2443;
    const app = function (req, res) {
        console.log("response handling!");
        res.statusCode = 204;
        res.end();
    };
    await https.createServer(opts, app).listen(port);
    
    const es = new EventSource(`https://localhost:${port}`, {
        https: {rejectUnauthorized: false}
    });
    es.addEventListener("data", data => {
        console.log("data", data);
    });
    setInterval(t => console.log(es.status), 1000);
}

testit().then(e => console.log(e));

// End
