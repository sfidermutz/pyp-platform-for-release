// telemetry/ingest_stub.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json({ limit: '5mb' }));

const outdir = path.join(process.cwd(), 'telemetry', 'raw');
if (!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true });

app.post('/ingest', (req, res) => {
  const payload = req.body;
  if (!payload || !payload.scenario_run_id) return res.status(400).send({error: 'invalid payload'});
  const fname = `${Date.now()}_${payload.scenario_run_id}.json`;
  fs.writeFileSync(path.join(outdir, fname), JSON.stringify(payload, null, 2));
  res.send({ ok: true, file: fname });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Telemetry ingest stub listening on ${port}`));
