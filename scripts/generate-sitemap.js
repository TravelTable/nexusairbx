const fs = require('fs');
const path = require('path');

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

async function fetchIconIds() {
  try {
    console.log('Fetching icons from backend...');
    // We fetch a large limit to get as many as possible for the sitemap
    // If there are thousands, we might need pagination, but starting with 1000
    const response = await fetch(`${BACKEND_URL}/api/icons/market?limit=1000`);
    const data = await response.json();
    return data.icons.map(icon => icon.id);
  } catch (error) {
    console.error('Error fetching icons:', error);
    return [];
  }
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
