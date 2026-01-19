const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_URL = 'https://nexusrbx.com';
const BACKEND_URL = 'https://nexusrbx-backend-production.up.railway.app';

const staticRoutes = [
  '',
  '/docs',
  '/ai',
  '/contact',
  '/privacy',
  '/terms',
  '/tools/icon-generator',
  '/icons-market',
];

function fetchIconIds() {
  return new Promise((resolve) => {
    console.log('Fetching icons from backend...');
    https.get(`${BACKEND_URL}/api/icons/market?limit=1000`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.icons.map(icon => icon.id));
        } catch (e) {
          console.error('Error parsing icons:', e);
          resolve([]);
        }
      });
    }).on('error', (err) => {
      console.error('Error fetching icons:', err);
      resolve([]);
    });
  });
}

async function generate() {
  const iconIds = await fetchIconIds();
  console.log(`Found ${iconIds.length} icons.`);

  const allRoutes = [
    ...staticRoutes,
    ...iconIds.map(id => `/icons/${id}`)
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
  .map(route => {
    return `  <url>
    <loc>${BASE_URL}${route}</loc>
    <changefreq>${route === '' ? 'daily' : 'weekly'}</changefreq>
    <priority>${route === '' ? '1.0' : '0.8'}</priority>
  </url>`;
  })
  .join('\n')}
</urlset>`;

  const outputPath = path.join(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(outputPath, sitemap);
  console.log(`Sitemap generated successfully at ${outputPath}`);
}

generate();
