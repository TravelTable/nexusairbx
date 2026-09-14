import { createContext, useContext } from "react";

export const WorkspacePresentationContext = createContext(null);
export const useWorkspacePresentation = () => useContext(WorkspacePresentationContext);
