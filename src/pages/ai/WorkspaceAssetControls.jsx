import React, { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from '../../components/shadcn/dropdown-menu';
import RobloxDecalUploadDropdown from '../../components/ai/workspace/RobloxDecalUploadDropdown';

export default function WorkspaceAssetControls({ navigateTo, user, planKey, devOverride, roblox, projectId, onAuthRequired, notify }) {
  const [query, setQuery] = useState('');
  const browse = (filters = {}) => {
    const params = new URLSearchParams({ ...(query.trim() ? { q: query.trim() } : {}), ...filters });
    const search = params.toString();
    navigateTo?.(`/icons-market${search ? `?${search}` : ''}`);
  };
  return <>
    <form className="workspace-asset-search" role="search" onSubmit={event => { event.preventDefault(); browse(); }}>
      <Search size={14} aria-hidden="true" /><input aria-label="Search assets" placeholder="Search assets…" value={query} onChange={event => setQuery(event.target.value)} />
    </form>
    <DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label="Asset filters" title="Filter catalog"><SlidersHorizontal size={15}/></button></DropdownMenuTrigger>
      <DropdownMenuContent className="workspace-asset-filters" align="end">
        <DropdownMenuLabel>Visual style</DropdownMenuLabel>
        {['3D Rendered','Flat Vector','Cartoonish','Outline'].map(style => <DropdownMenuItem key={style} onSelect={() => browse({ style })}>{style}</DropdownMenuItem>)}
        <DropdownMenuSeparator/><DropdownMenuItem onSelect={() => browse({ access: 'free' })}>Free icons</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => browse()}>All matching icons</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <RobloxDecalUploadDropdown user={user} planKey={planKey} devOverride={devOverride} roblox={roblox} projectId={projectId}
      onAttached={() => roblox?.refreshProjectAssets?.()} onAuthRequired={onAuthRequired} notify={notify}/>
  </>;
}
