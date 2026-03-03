const http = require("http");
const crypto = require("crypto");
const { exec } = require("child_process");

const PORT = 9876;
const SECRET = "apogee-deploy-secret-2026";
const DEPLOY_DIR = "/home/webapps/sites/apogeedemo";

function verifySignature(payload, signature) {
  const hmac = crypto.createHmac("sha256", SECRET);
  const digest = "sha256=" + hmac.update(payload).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch (e) {
    return false;
  }
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/deploy") {
    res.writeHead(200);
    res.end("Apogee webhook ready");
    return;
  }

  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", () => {
    const sig = req.headers["x-hub-signature-256"] || "";
    if (!verifySignature(body, sig)) {
      console.log(new Date().toISOString() + " - Invalid signature");
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    let payload;
    try { payload = JSON.parse(body); } catch (e) {
      res.writeHead(400);
      res.end("Bad JSON");
      return;
    }

    if (payload.ref !== "refs/heads/dev") {
      res.writeHead(200);
      res.end("Ignored branch: " + payload.ref);
      return;
    }

    console.log(new Date().toISOString() + " - Deploy triggered");
    res.writeHead(200);
    res.end("Deploy started");

    const cmd = "cd " + DEPLOY_DIR + " && git pull origin dev && docker compose up -d --build --force-recreate && docker image prune -f";
    exec(cmd, { timeout: 300000 }, (err, stdout, stderr) => {
      if (err) {
        console.error(new Date().toISOString() + " - Deploy FAILED: " + err.message);
      } else {
        console.log(new Date().toISOString() + " - Deploy OK");
      }
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
    });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(new Date().toISOString() + " - Webhook listening on port " + PORT);
});
