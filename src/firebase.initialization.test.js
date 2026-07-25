import fs from "fs";
import path from "path";

describe("Firebase initialization contract", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "src/firebase.js"), "utf8");

  test("guards the Firebase app singleton", () => {
    expect(source).toMatch(
      /getApps\(\)\.length\s*\?\s*getApps\(\)\[0\]\s*:\s*initializeApp\(firebaseConfig\)/
    );
  });

  test("initializes App Check before network-capable Firebase services", () => {
    const appCheckIndex = source.indexOf(
      "export const appCheck = initializeFirebaseAppCheck(app, {"
    );
    const serviceInitializers = [
      "export const auth = getAuth(app)",
      "export const db = initializeFirestore(app, firestoreOptions)",
      "export const functions = getFunctions(app)",
      "export const storage = getStorage(app)",
    ];

    expect(appCheckIndex).toBeGreaterThan(-1);
    for (const initializer of serviceInitializers) {
      expect(source.indexOf(initializer)).toBeGreaterThan(appCheckIndex);
    }
  });
});
