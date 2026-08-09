import React from "react";
import { Link } from "react-router-dom";

import { Button } from "../shadcn/button";

export default function SettingsSignInAction() {
  return (
    <Button asChild className="min-h-11">
      <Link to="/signin">Sign in</Link>
    </Button>
  );
}
