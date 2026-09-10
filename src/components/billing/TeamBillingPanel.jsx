import NexusSelect from "../ui/NexusSelect";
import React, { useEffect, useState } from "react";
import { authedFetch, startCreditPackCheckout } from "../../lib/billing";
import { CREDIT_PACKS, formatMoney } from "../../lib/planCatalog";
const requestKeys = new Map();
async function request(path, body, method="POST") {
  const fingerprint = JSON.stringify([path, body, method]);
  if (!requestKeys.has(fingerprint)) requestKeys.set(fingerprint, "team-"+crypto.randomUUID());
  const response=await authedFetch("/api/billing/teams"+path,{method,
    headers:{"Content-Type":"application/json","Idempotency-Key":requestKeys.get(fingerprint)},
    ...(body ? {body:JSON.stringify(body)} : {})});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||data.code||"Team request failed");
  return data;
}
export default function TeamBillingPanel() {
  const [enabled,setEnabled]=useState(false),[teams,setTeams]=useState([]),[selected,setSelected]=useState("");
  const [team,setTeam]=useState(null),[name,setName]=useState(""),[email,setEmail]=useState("");
  const [seats,setSeats]=useState(2),[project,setProject]=useState(""),[invite,setInvite]=useState("");
  const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  const token=new URLSearchParams(window.location.search).get("teamInvite");
  async function list(){setTeams((await request("",null,"GET")).teams);}
  useEffect(()=>{
    let active=true;
    authedFetch("/api/billing/catalog").then(r=>r.json()).then(data=>{
      if(active&&data.teamEnabled){setEnabled(true);void list().catch(e=>setMessage(e.message));}
    }).catch(()=>{});
    return()=>{active=false;};
  },[]);
  useEffect(()=>{
    if(!selected){setTeam(null);return;}
    let active=true;
    request("/"+selected,null,"GET").then(data=>{if(active){setTeam(data);setSeats(Math.max(2,data.members.length));}}).catch(e=>setMessage(e.message));
    return()=>{active=false;};
  },[selected]);
  async function act(action,success){
    setBusy(true);setMessage("");
    try {await action();if(success)setMessage(success);}
    catch(e){setMessage(e.message);}
    finally{setBusy(false);}
  }
  if(!enabled)return <section><h2>Team workspaces</h2><p>Team billing is coming soon. Existing personal plans are unchanged.</p></section>;
  const canManage=team&&["owner","admin"].includes(team.role);
  return <section aria-labelledby="team-billing-heading">
    <h2 id="team-billing-heading">Team workspace billing</h2>
    {message&&<p role="status" className="account-ledger-notice">{message}</p>}
    {token&&<button className="account-ledger-button" disabled={busy} onClick={()=>act(async()=>{
      const result=await request("/accept",{token});await list();setSelected(result.teamId);
    },"Invitation accepted.")}>Accept your Team invitation</button>}
    <form onSubmit={e=>{e.preventDefault();void act(async()=>{
      const created=await request("",{name});await list();setSelected(created.id);setName("");
    },"Workspace created. Review a Team subscription before inviting members.");}}>
      <label>New workspace name <input required maxLength={100} value={name} onChange={e=>setName(e.target.value)} /></label>
      <button className="account-ledger-button" disabled={busy}>Create workspace</button>
    </form>
    <label>Workspace <NexusSelect value={selected} onChange={e=>setSelected(e.target.value)}>
      <option value="">Choose a workspace</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
    </NexusSelect></label>
    {team&&<>
      <p>{team.name} · your role: {team.role} · {(team.credits.totalAvailableCreditsMicros/1e6).toFixed(2)} pooled Nexus Credits available</p>
      <ul>{team.members.map(member=><li key={member.uid}>{member.uid} · {member.role}
        {canManage&&member.role!=="owner"&&<button disabled={busy} onClick={()=>act(async()=>{
          await request("/"+selected+"/members/"+member.uid,null,"DELETE");
          setTeam(await request("/"+selected,null,"GET"));
        },"Member removed. Seat quantity is unchanged.")}>Remove member</button>}
      </li>)}</ul>
      {canManage&&<>
        <button className="account-ledger-button" disabled={busy} onClick={()=>act(async()=>{
          const response=await authedFetch("/api/portal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({teamId:selected})});
          const result=await response.json();if(!response.ok||!result.url)throw new Error(result.code||"Team portal unavailable");
          window.location.assign(result.url);
        })}>Team invoices and payment details</button>
        <label>Paid seats <input type="number" min={2} max={50} step={1} value={seats} onChange={e=>setSeats(Number(e.target.value))}/></label>
        <p>Team is $24.99 per seat monthly, with 15 credits per seat pooled. Seat changes may add prorated charges.</p>
        <a className="account-ledger-link" href={"/subscribe?plan=TEAM&interval=month&seats="+seats+"&teamId="+encodeURIComponent(selected)}>Review a new Team subscription</a>
        <button className="account-ledger-button" disabled={busy} onClick={()=>act(()=>request("/"+selected+"/seats",{seatCount:seats}),"Seat change submitted. Payment may need confirmation.")}>Update existing subscription seats</button>
        <form onSubmit={e=>{e.preventDefault();void act(async()=>{
          const result=await request("/"+selected+"/invitations",{email,role:"member"});
          setInvite(window.location.origin+"/billing?teamInvite="+encodeURIComponent(result.token));setEmail("");
        },"Invitation prepared. Send this link privately to the invited email address.");}}>
          <label>Invite email <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
          <button className="account-ledger-button" disabled={busy}>Prepare invitation</button>
        </form>
        {invite&&<label>Private invitation link <input readOnly value={invite} onFocus={e=>e.target.select()}/></label>}
        <form onSubmit={e=>{e.preventDefault();void act(()=>request("/"+selected+"/projects/"+encodeURIComponent(project),{}),"This project now bills the Team pool. Project file sharing is managed separately.");}}>
          <label>Project ID to bill to this workspace <input required value={project} onChange={e=>setProject(e.target.value)}/></label>
          <button className="account-ledger-button" disabled={busy}>Assign project billing</button>
        </form>
        <p>Assigning a project authorizes future AI work in that project to use this workspace’s pooled credits.</p>
        <div className="account-ledger-inline-actions">{CREDIT_PACKS.map(pack=><button className="account-ledger-button" key={pack.id} disabled={busy} onClick={()=>act(async()=>{
          const result=await startCreditPackCheckout({creditPack:pack.id,teamId:selected});window.location.assign(result.url);
        })}>{pack.name} · {pack.credits} Team credits · {formatMoney(pack.price)}</button>)}</div>
      </>}
    </>}
  </section>;
}
