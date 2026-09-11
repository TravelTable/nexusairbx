const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
test('packaged backend catalog matches the canonical frontend catalog exactly',()=>{
 const root=path.resolve(__dirname,'..');
 const source=JSON.parse(fs.readFileSync(path.join(root,'src/data/billingCatalog.v2.json'),'utf8'));
 const backend=JSON.parse(fs.readFileSync(path.join(root,'backend/shared/billingCatalog.v2.json'),'utf8'));
 assert.deepEqual(backend,source);
 assert.deepEqual(source.plans.map(p=>p.id),['FREE','STARTER','PRO','TEAM']);
 assert.equal(source.plans[2].monthly,14.99);assert.equal(source.plans[2].yearly,152.90);
 assert.equal(source.plans[2].credits,9);assert.equal(source.providerCostMultiplier,3);
 const frontendConfig=fs.readFileSync(path.join(root,'src/config.js'),'utf8');
 assert.doesNotMatch(frontendConfig,/price_[A-Za-z0-9]+/,'the browser must not ship a second Stripe price-ID source');
 for(const plan of source.plans){
  assert.equal(typeof plan.id,'string');assert.equal(typeof plan.name,'string');
  assert.ok(Number.isFinite(plan.monthly));assert.ok(Number.isFinite(plan.credits));
  if(plan.yearly!==null)assert.ok(Number.isFinite(plan.yearly));
 }
});
