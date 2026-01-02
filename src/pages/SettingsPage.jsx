import React, { useState } from "react";
import ConfirmationModal from "../components/ConfirmationModal";

const SettingsPage = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const handleTriggerClearChats = () => {
    setPendingAction("chats");
    setModalOpen(true);
  };

  const handleTriggerClearScripts = () => {
    setPendingAction("scripts");
    setModalOpen(true);
  };

  const handleFinalConfirm = () => {
    if (pendingAction === "chats") {
      // Placeholder for API request to clear chats
      console.log("API CALL: Deleting all chat history...");
    } else if (pendingAction === "scripts") {
      // Placeholder for API request to clear scripts
      console.log("API CALL: Deleting all saved scripts...");
    }
    setModalOpen(false);
    setPendingAction(null);
  };

  return (
    <div className="min-h-screen bg-black text-gray-200 p-8 pt-24">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

        <section className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Profile & Account
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value="user@example.com"
                disabled
                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Display Name
              </label>
              <input
                type="text"
                defaultValue="NexusUser"
                className="w-full bg-black border border-gray-700 rounded p-2 text-white focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </section>

        <section className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            AI Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Default Model
              </label>
              <select className="w-full bg-black border border-gray-700 rounded p-2 text-white outline-none">
                <option>Nexus-4 (High Accuracy)</option>
                <option>Nexus-3 (Fast)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Creativity Level
              </label>
              <select className="w-full bg-black border border-gray-700 rounded p-2 text-white outline-none">
                <option>Balanced</option>
                <option>Strict (Code Optimized)</option>
                <option>Creative</option>
              </select>
            </div>
          </div>
        </section>

        <section className="border border-red-900/50 bg-red-900/10 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
          <h2 className="text-xl font-bold text-red-500 mb-2">Danger Zone</h2>
          <p className="text-gray-400 text-sm mb-6">
            Actions here are irreversible. Please be certain.
          </p>

          <div className="flex flex-col md:flex-row gap-4">
            <button
              onClick={handleTriggerClearChats}
              className="flex-1 bg-transparent border border-red-800 text-red-400 hover:bg-red-900/40 hover:text-red-200 py-3 rounded-lg font-medium transition-colors text-left px-4 flex justify-between items-center"
            >
              <span>Clear All Chat History</span>
              <span className="text-xs border border-red-900 px-2 py-1 rounded">
                PERMANENT
              </span>
            </button>

            <button
              onClick={handleTriggerClearScripts}
              className="flex-1 bg-transparent border border-red-800 text-red-400 hover:bg-red-900/40 hover:text-red-200 py-3 rounded-lg font-medium transition-colors text-left px-4 flex justify-between items-center"
            >
              <span>Delete All Saved Scripts</span>
              <span className="text-xs border border-red-900 px-2 py-1 rounded">
                PERMANENT
              </span>
            </button>
          </div>
        </section>
      </div>

      <ConfirmationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleFinalConfirm}
        title={pendingAction === "chats" ? "Clear All Chats?" : "Delete All Scripts?"}
        message={
          pendingAction === "chats"
            ? "This will permanently remove your entire conversation history from the database. This action cannot be undone."
            : "This will permanently delete all scripts you have saved to your library. You will lose access to them immediately."
        }
        warningKeyword={pendingAction === "chats" ? "DELETE CHATS" : "DELETE SCRIPTS"}
      />
    </div>
  );
};

export default SettingsPage;
