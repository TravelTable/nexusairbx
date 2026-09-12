const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
require(path.join(root,'backend/node_modules/dotenv')).config({path:path.join(root,'backend/.env'),quiet:true});
const {firestore,admin}=require(path.join(root,'backend/src/lib/firebaseAdmin'));
const {normalizeUiDocument}=require(path.join(root,'backend/src/lib/uiDocument'));
(async()=>{
 const ref=firestore.collection('users').doc('0VSQotqOXxPXBLeQu1gUNkXELWH3').collection('ui_designs').doc('sUlmbOLCMNIzjn8faG6E');
 const record=(await ref.get()).data();
 const before=record.document;
 const document=normalizeUiDocument({...before,updatedAt:new Date().toISOString(),sourceFiles:before.sourceFiles.map(f=>({...f,content:f.content.replaceAll('Enum.FontWeight.Black','Enum.FontWeight.Heavy').replace(/^.*\.Font = Enum\.Font\.Montserrat\s*$/gm,'').replace('playText.Size = UDim2.new(0, 120, 1, 0)','playText.Size = UDim2.new(0, 148, 1, 0)').replace('btnPlay.Image = "nexusasset://asset_c1f2d36cdd3345d794b7484db0be0a35"',`btnPlay.Image = ""
        btnPlay.BackgroundTransparency = 0
        btnPlay.BackgroundColor3 = Color3.fromRGB(8, 110, 125)
        btnPlay.BorderSizePixel = 0
        local playCorner = Instance.new("UICorner")
        playCorner.CornerRadius = UDim.new(0, 12)
        playCorner.Parent = btnPlay
        local playBorder = Instance.new("UIStroke")
        playBorder.Color = COLOR_GOLD
        playBorder.Thickness = 1.5
        playBorder.Transparency = 0.25
        playBorder.Parent = btnPlay`).replace('return screenGui','for _, node in screenGui:GetDescendants() do\n\t\tif (node:IsA("TextLabel") or node:IsA("TextButton") or node:IsA("TextBox")) and node.Text == "" then node.FontFace = FONT_MONT_SEMI end\n\tend\n\treturn screenGui')}))});
 const response=await fetch('http://127.0.0.1:8099/v1/build-model',{method:'POST',headers:{Authorization:`Bearer ${process.env.UI_PREVIEW_RENDERER_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({files:document.sourceFiles,rootName:'UI_'+document.designId})});
 const model=await response.json();
 if(!response.ok) throw new Error(JSON.stringify(model));
 fs.writeFileSync(path.join(__dirname,'skybound-compiled.rbxm'),Buffer.from(model.rbxmBase64,'base64'));
 await firestore.runTransaction(async tx=>{
  const latest=(await tx.get(ref)).data();
  if(latest.document.revision!==before.revision) throw new Error('Revision changed');
  const checkpoint=ref.collection('checkpoints').doc();
  tx.set(checkpoint,{checkpointId:checkpoint.id,reason:'before_font_enum_fix',revision:before.revision,document:before,hooksSource:record.hooksSource||'',createdAt:admin.firestore.FieldValue.serverTimestamp()});
  tx.update(ref,{document,revision:document.revision,updatedAt:document.updatedAt});
 });
 fs.writeFileSync(path.join(__dirname,'skybound-corrected-source.json'),JSON.stringify(document,null,2));
 console.log(JSON.stringify({revision:document.revision,nodeCount:model.nodeCount,builderRevision:model.builderRevision}));
 process.exit(0);
})().catch(e=>{console.error(e.message);process.exit(1)});
