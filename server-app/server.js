const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Enable CORS for React app
app.use(cors());

// Parse JSON body with a small limit to trigger 413 errors
// Set to 20KB - adjust this to control when 413 occurs
app.use(express.json({ limit: '20kb' }));

// Handle the stress test endpoint - POST with hospitalIds in body
app.post('/hospitals/v1/data/:ids/details', (req, res) => {
  const idsParam = req.params.ids;
  const pathIds = idsParam ? idsParam.split(',').filter(id => id.trim()) : [];
  const bodyIds = req.body.hospitalIds || [];
  
  console.log(`[${new Date().toISOString()}] POST Request received:`);
  console.log(`  URL Length: ${req.url.length} characters`);
  console.log(`  Path Length: ${req.path.length} characters`);
  console.log(`  Path IDs count: ${pathIds.length}`);
  console.log(`  Body IDs count: ${bodyIds.length}`);
  console.log(`  Body size: ${JSON.stringify(req.body).length} bytes`);
  
  res.status(200).json({
    success: true,
    message: 'Request successful',
    stats: {
      urlLength: req.url.length,
      pathLength: req.path.length,
      pathIdCount: pathIds.length,
      bodyIdCount: bodyIds.length,
      bodySize: JSON.stringify(req.body).length
    },
    ids: bodyIds
  });
});

// Handle POST without path IDs
app.post('/hospitals/v1/data/details', (req, res) => {
  const bodyIds = req.body.hospitalIds || [];
  
  console.log(`[${new Date().toISOString()}] POST Request (no path IDs):`);
  console.log(`  Body IDs count: ${bodyIds.length}`);
  console.log(`  Body size: ${JSON.stringify(req.body).length} bytes`);
  
  res.status(200).json({
    success: true,
    message: 'Request successful',
    stats: {
      urlLength: req.url.length,
      pathLength: req.path.length,
      bodyIdCount: bodyIds.length,
      bodySize: JSON.stringify(req.body).length
    },
    ids: bodyIds
  });
});

// Handle the stress test endpoint - accepts any length of IDs in the path
app.get('/hospitals/v1/data/:ids/details', (req, res) => {
  const idsParam = req.params.ids;
  const ids = idsParam ? idsParam.split(',').filter(id => id.trim()) : [];
  
  console.log(`[${new Date().toISOString()}] Request received:`);
  console.log(`  URL Length: ${req.url.length} characters`);
  console.log(`  Path Length: ${req.path.length} characters`);
  console.log(`  Number of IDs: ${ids.length}`);
  
  res.status(200).json({
    success: true,
    message: 'Request successful',
    stats: {
      urlLength: req.url.length,
      pathLength: req.path.length,
      idCount: ids.length
    },
    ids: ids
  });
});

// Handle empty IDs case
app.get('/hospitals/v1/data/details', (req, res) => {
  console.log(`[${new Date().toISOString()}] Request with no IDs`);
  
  res.status(200).json({
    success: true,
    message: 'Request successful (no IDs)',
    stats: {
      urlLength: req.url.length,
      pathLength: req.path.length,
      idCount: 0
    },
    ids: []
  });
});

app.listen(PORT, () => {
  console.log(`\n🏥 Mock Pet Hospital Server running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /hospitals/v1/data/:ids/details (with hospitalIds in body)`);
  console.log(`  GET  /hospitals/v1/data/:ids/details`);
  console.log(`\nBody size limit: 10KB (will return 413 if exceeded)`);
  console.log(`Example: http://localhost:${PORT}/hospitals/v1/data/1234,5678/details\n`);
});
