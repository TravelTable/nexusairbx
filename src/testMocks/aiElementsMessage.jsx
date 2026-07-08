import React from "react";

export const MessageResponse = ({ children, className }) => (
  <div className={className}>{children}</div>
);

export const Message = ({ children, ...props }) => <div {...props}>{children}</div>;
export const MessageContent = ({ children, ...props }) => <div {...props}>{children}</div>;
