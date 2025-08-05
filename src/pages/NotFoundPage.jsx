// src/pages/NotFoundPage.jsx
import React from "react";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "react-router-dom";

export default function NexusRBXNotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D0D0D] text-white">
      <AlertCircle className="h-16 w-16 text-red-500 mb-6" />
      <h1 className="text-4xl font-bold mb-2">404 - Page Not Found</h1>
      <p className="text-gray-400 mb-6">
        Sorry, the page you are looking for does not exist.
      </p>
      <Link
        to="/"
        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#9b5de5] to-[#00f5d4] rounded-lg text-white font-semibold hover:shadow-lg transition-all"
      >
        <Home className="h-5 w-5 mr-2" />
        Go Home
      </Link>
    </div>
  );
}