import React from 'react';
import { AccountControl } from './SiteHeader';
import useHeaderIdentity from './useHeaderIdentity';

export default function WorkspaceAccountControl() {
  const identity = useHeaderIdentity();
  return <AccountControl identity={identity} compact showWorkspaceAction={false} />;
}
