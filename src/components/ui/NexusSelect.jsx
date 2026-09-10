import React, { Children, forwardRef, isValidElement, useId, useState } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from '../shadcn/select';
import './NexusSelect.css';

function collectOptions(children, group, groupDisabled = false) {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement(child)) return [];
    if (child.type === React.Fragment) return collectOptions(child.props.children, group, groupDisabled);
    if (child.type === 'optgroup') return collectOptions(child.props.children, child.props.label, child.props.disabled);
    if (child.type !== 'option' || child.props.hidden) return [];
    return [{ value: String(child.props.value ?? child.props.children ?? ''), label: child.props.children,
      disabled: groupDisabled || child.props.disabled, title: child.props.title, group }];
  });
}

/** Shared accessible replacement for single-value native selects. */
const NexusSelect = forwardRef(function NexusSelect({ children, value, defaultValue, onChange,
  disabled, required, name, className = '', placeholder, ...props }, ref) {
  const options = collectOptions(children);
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? options[0]?.value ?? '');
  const selected = String(value ?? uncontrolled);
  const emptyValue = useId();
  const emptyOption = options.find(option => option.value === '');
  const groups = [...new Set(options.map(option => option.group))];
  const change = next => {
    const nextValue = next === emptyValue ? '' : next;
    setUncontrolled(nextValue);
    const target = { value: nextValue, name, id: props.id };
    onChange?.({ target, currentTarget: target });
  };
  return <Select value={selected} onValueChange={change} disabled={disabled || !options.length} required={required} name={name}>
    <SelectTrigger {...props} ref={ref} className={`nx-select ${className}`}>
      <SelectValue placeholder={placeholder || emptyOption?.label || 'Choose…'} />
    </SelectTrigger>
    <SelectContent className="nx-select-content" position="popper" sideOffset={4} collisionPadding={10}>
      {groups.map((group, index) => <SelectGroup key={group || index}>
        {group ? <SelectLabel className="nx-select-group">{group}</SelectLabel> : null}
        {options.filter(option => option.group === group).map(option => <SelectItem className="nx-select-option"
          key={option.value} value={option.value || emptyValue} disabled={option.disabled} title={option.title}>
          {option.label}
        </SelectItem>)}
      </SelectGroup>)}
    </SelectContent>
  </Select>;
});

export default NexusSelect;
