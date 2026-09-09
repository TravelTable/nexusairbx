import React, { useState } from "react";
import { Button } from "../../../components/ui";

const events = { Activated: "Click / tap", MouseEnter: "Pointer enters", MouseLeave: "Pointer leaves", Focused: "Focused", FocusLost: "Focus lost" };
const types = { openModal: "Open modal", closeModal: "Close modal", selectTab: "Select tab", setVisible: "Set visibility",
  toggleVisible: "Toggle visibility", setText: "Change text", setState: "Set state", emitHook: "Run game hook" };

export default function UiActionEditor({ node, nodes, disabled, onSave }) {
  const [interactions, setInteractions] = useState(node.interactions || {});
  const [event, setEvent] = useState("Activated");
  const [dirty, setDirty] = useState(false);
  const actions = interactions[event] || [];
  const update = next => { setInteractions(current => ({ ...current, [event]: next })); setDirty(true); };
  const patch = (index, value) => update(actions.map((action, i) => i === index ? { ...action, ...value } : action));
  return <div className="ui-creator__actions">
    <label>When<select value={event} onChange={e => setEvent(e.target.value)}>{Object.entries(events).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    {actions.map((action, index) => <fieldset key={action.id || index} disabled={disabled}>
      <legend>Action {index + 1}</legend>
      <label>Do<select value={action.type} onChange={e => patch(index, { type: e.target.value, value: e.target.value === "setVisible" ? true : "" })}>{Object.entries(types).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      {!["setState", "emitHook"].includes(action.type) ? <label>Element<select value={action.targetId || ""} onChange={e => patch(index, { targetId: e.target.value })}><option value="">Choose an element</option>{nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</select></label> : null}
      {action.type === "setVisible" ? <label>Visibility<select value={String(action.value === true)} onChange={e => patch(index, { value: e.target.value === "true" })}><option value="true">Visible</option><option value="false">Hidden</option></select></label> : null}
      {action.type === "setText" ? <label>Text<input value={action.value ?? ""} onChange={e => patch(index, { value: e.target.value })} /></label> : null}
      {action.type === "setState" ? <><label>State key<input value={action.key || ""} onChange={e => patch(index, { key: e.target.value })} /></label>
        <label>Value<input value={String(action.value ?? "")} onChange={e => patch(index, { value: e.target.value === "true" ? true : e.target.value === "false" ? false : e.target.value })} /></label></> : null}
      {action.type === "emitHook" ? <label>Hook name<input value={action.hook || ""} onChange={e => patch(index, { hook: e.target.value })} /></label> : null}
      <div className="ui-creator__action-controls"><Button variant="secondary" size="sm" disabled={disabled || index === 0} onClick={() => { const next = [...actions]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; update(next); }}>Move up</Button>
        <Button variant="secondary" size="sm" disabled={disabled} onClick={() => update(actions.filter((_, i) => i !== index))}>Remove</Button></div>
    </fieldset>)}
    <div className="ui-creator__action-controls"><Button variant="secondary" disabled={disabled || actions.length >= 20} onClick={() => update([...actions, { id: "action_" + crypto.randomUUID(), type: "openModal", targetId: nodes.find(n => n.id !== node.id)?.id || node.id }])}>Add action</Button>
      <Button disabled={disabled || !dirty} onClick={() => onSave({ type: "setInteraction", nodeId: node.id, interactions })}>Save actions</Button></div>
  </div>;
}
