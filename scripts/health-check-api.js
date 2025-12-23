// scripts/health-check-api.js
// Node.js script to check local dev endpoints quickly.
const fetch = (global.fetch) ? global.fetch : require('node-fetch');

async function check(url) {
  try {
    const r = await fetch(url);
    console.log(`${url} -> ${r.status}`);
    if (r.ok) {
      const j = await r.text();
      console.log(`  body len: ${j.length}`);
    } else {
      const txt = await r.text();
      console.log('  body:', txt.slice(0, 512));
    }
  } catch (e) {
    console.error(`${url} -> error`, String(e));
  }
}

(async function() {
  console.log('Health check (assumes dev server on http://localhost:3000)');
  await check('http://localhost:3000/api/module-scenarios?module=HYB');
  await check('http://localhost:3000/api/scenario/HYB-01');
})();
