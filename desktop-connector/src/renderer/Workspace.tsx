import DesktopWorkspace from "../../../src/desktop/DesktopWorkspace.jsx";
import { lazy } from 'react';
const DesktopEditor = lazy(() => import('./platform/Editor.jsx'));
import "@fontsource-variable/instrument-sans/wght.css";
import "@fontsource-variable/atkinson-hyperlegible-mono/wght.css";
import "@fontsource-variable/sofia-sans-condensed/wght.css";
import "@fontsource-variable/atkinson-hyperlegible-next/wght.css";
import "@fontsource-variable/dm-sans/wght.css";
export function Workspace({ onBack }: { onBack: () => void }) { return <DesktopWorkspace onBack={onBack} EditorComponent={DesktopEditor} />; }
