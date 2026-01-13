import React, { useState, lazy } from 'react';
import { useParams, useNavigate } from "react-router-dom";

const CodeModal = lazy(() => import("../CodeModal"));

export default function ScriptShareModalWrapper() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  return (
    <CodeModal
      open={open}
      onClose={() => {
        setOpen(false);
        setTimeout(() => navigate("/ai"), 200);
      }}
      scriptId={id}
      readOnly={true}
    />
  );
}
