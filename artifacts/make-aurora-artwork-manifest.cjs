const fs=require('fs');
const components=[];
function component(id,nodeName,role,description,icon){
 components.push({id,requirementId:id,nodeName,primitive:role==='panel_surface'?'Frame':role==='control_artwork'?(nodeName==='VolumeSlider'?'Slider':'Toggle'):role==='component_surface'?'ImageButton':'ImageLabel',visualTreatment:role+' '+description,paletteRole:'primary',icon:icon?{enabled:true,assetStrategy:'generated',semanticRole:icon,consistencyGroup:'aurora_symbols'}:{enabled:false}});
}
component('title','TitlePlate','ornament','blank ornamental title plate');
component('play','PlayButton','component_surface','primary broad bevel navy cyan bright inner rim','play');
for(const [id,node,icon] of [['settings','SettingsButton','settings'],['credits','CreditsButton','credits']])component(id,node,'component_surface','secondary navy cyan subdued bevel gold trim',icon);
for(const [id,node] of [['settings_panel','SettingsPanel'],['credits_panel','CreditsPanel']])component(id,node,'panel_surface','shared navy panel cyan edge restrained gold trim opaque dark interior');
for(const [id,node] of [['settings_close','SettingsCloseButton'],['credits_close','CreditsCloseButton']])component(id,node,'component_surface','shared blank square close skin navy cyan gold rim','close');
component('corner','CornerOrnament','ornament','ONE L-shaped corner flourish navy cyan restrained gold');
component('volume','VolumeSlider','control_artwork','slider separate track fill and handle');
component('music','MusicToggle','control_artwork','toggle separate on off housings and thumb');
const requirements=components.map(c=>({id:'art_'+c.id,assetType:'image',semanticRole:c.visualTreatment.split(' ')[0],required:true,componentIds:[c.id],styleDescription:c.visualTreatment}));
const planning={origin:'Explicit user artwork manifest; not an AI layout plan',requirementSpec:{assetRequirements:requirements},designPlan:{artDirection:'Premium fantasy-tech enamel. Deep navy surfaces, bright cyan accents, restrained gold trim, rounded bevels and crisp outlines. Subtle lighting contained inside each object.',visualSystem:{palette:{primary:'#0B1830',secondary:'#123754',accent:'#22D9F3',neutralSurface:'#091325',outline:'#030A16',shadow:'#030A16',textPrimary:'#EAF9FF',gold:'#CFA95B'},outlineStyle:'crisp deep navy contours with narrow cyan highlights and restrained warm gold trim'},iconSystem:{family:'aurora_fantasy_tech',styleDescription:'Front-facing navy and cyan symbols with restrained gold edging',consistencyGroup:'aurora_symbols'},componentSystem:components}};
fs.writeFileSync('artifacts/aurora-artwork-manifest.json',JSON.stringify(planning,null,2));
const needs=require('../backend/src/lib/uiArtwork').planUiArtwork({...planning,sheetMode:true});
if(needs.length!==16||needs.some(n=>!n.required))throw Error('The explicit kit must resolve to sixteen required assets.');
console.log(needs.map(n=>({part:n.controlPart||n.semanticRole||n.role,nodes:n.metadata.nodeNames})));
