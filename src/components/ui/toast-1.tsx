import * as React from "react";
import { Toast } from "@base-ui/react/toast";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import "./toast-1.css";

type ToastAction = {
  label: string;
  onClick?: () => void;
  primary?: boolean;
};

export type SiteToastInput = {
  id?: string;
  title?: string;
  message: string;
  type?: "info" | "success" | "error";
  duration?: number;
  cta?: ToastAction;
  secondary?: ToastAction;
};

type SiteToastData = Pick<SiteToastInput, "cta" | "secondary">;

export const siteToastManager = Toast.createToastManager<SiteToastData>();

export function notifyToast(input: SiteToastInput) {
  const type = input?.type || "info";
  const message = String(input?.message || "").trim();
  if (!message) return "";

  return siteToastManager.add({
    id: input.id,
    type,
    title: input.title || (type === "error" ? "Something went wrong" : type === "success" ? "Done" : "Notice"),
    description: message,
    timeout: input.duration || 4000,
    priority: type === "error" ? "high" : "low",
    data: { cta: input.cta, secondary: input.secondary },
  });
}

export function SiteToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider toastManager={siteToastManager} timeout={4000} limit={5}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="nexus-toast-viewport">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function ToastList() {
  const manager = Toast.useToastManager<SiteToastData>();

  return <>{manager.toasts.map((toast) => {
    const type = toast.type || "info";
    const Icon = type === "error" ? AlertCircle : type === "success" ? CheckCircle2 : Info;
    const runAction = (action: ToastAction | undefined, control: HTMLButtonElement) => {
      control.blur();
      action?.onClick?.();
      manager.close(toast.id);
    };

    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        className="nexus-site-toast"
        data-variant={type}
        style={{
          ["--toast-gap" as string]: "0.75rem",
        }}
      >
        <div className="nexus-site-toast__icon" aria-hidden="true">
          <Icon />
        </div>
        <div className="nexus-site-toast__content">
          <Toast.Title className="nexus-site-toast__title" />
          <Toast.Description className="nexus-site-toast__description" />
          {toast.data?.cta || toast.data?.secondary ? (
            <div className="nexus-site-toast__actions">
              {toast.data.secondary ? (
                <button type="button" onClick={(event) => runAction(toast.data?.secondary, event.currentTarget)}>
                  {toast.data.secondary.label}
                </button>
              ) : null}
              {toast.data.cta ? (
                <button type="button" data-primary="true" onClick={(event) => runAction(toast.data?.cta, event.currentTarget)}>
                  {toast.data.cta.label}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <Toast.Close
          className="nexus-site-toast__close"
          aria-label="Close notification"
          onClickCapture={(event) => event.currentTarget.blur()}
        >
          <X aria-hidden="true" />
        </Toast.Close>
      </Toast.Root>
    );
  })}</>;
}

export default SiteToastProvider;
