const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
test('packaged backend catalog matches the canonical frontend catalog exactly',()=>{
 const root=path.resolve(__dirname,'..');
 const source=JSON.parse(fs.readFileSync(path.join(root,'src/data/billingCatalog.v2.json'),'utf8'));
 const backend=JSON.parse(fs.readFileSync(path.join(root,'backend/shared/billingCatalog.v2.json'),'utf8'));
 assert.deepEqual(backend,source);
 assert.deepEqual(source.plans.map(p=>p.id),['FREE','PRO','TEAM']);
 assert.equal(source.plans[1].monthly,14.99);assert.equal(source.plans[1].yearly,152.90);
 assert.equal(source.plans[1].credits,9);assert.equal(source.providerCostMultiplier,3);
});
