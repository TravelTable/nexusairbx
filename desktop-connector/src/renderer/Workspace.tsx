import DesktopWorkspace from "../../../src/desktop/DesktopWorkspace.jsx";
import { lazy } from 'react';
const DesktopEditor = lazy(() => import('./platform/Editor.jsx'));
import "@fontsource-variable/geist/wght.css";
import "@fontsource-variable/geist-mono/wght.css";
export function Workspace({ onBack }: { onBack: () => void }) { return <DesktopWorkspace onBack={onBack} EditorComponent={DesktopEditor} />; }
