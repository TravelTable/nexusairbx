import {
  requireVerifiedFirestoreUser,
  VERIFY_EMAIL_BEFORE_CHAT_WRITE,
} from "./verifiedFirestoreUser";

function authUser(overrides = {}) {
  return {
    uid: "user-1",
    emailVerified: true,
    reload: jest.fn().mockResolvedValue(undefined),
    getIdToken: jest.fn().mockResolvedValue("token"),
    getIdTokenResult: jest.fn().mockResolvedValue({
      claims: { email_verified: true },
    }),
    ...overrides,
  };
}

describe("requireVerifiedFirestoreUser", () => {
  test("reloads both user and token before allowing a write", async () => {
    const user = authUser();
    await expect(requireVerifiedFirestoreUser(user, user)).resolves.toBe(user);
    expect(user.reload).toHaveBeenCalledTimes(1);
    expect(user.getIdToken).toHaveBeenCalledWith(true);
    expect(user.getIdTokenResult).toHaveBeenCalledWith(true);
  });

  test("blocks an unverified user with actionable copy", async () => {
    const user = authUser({
      emailVerified: false,
      getIdTokenResult: jest.fn().mockResolvedValue({
        claims: { email_verified: false },
      }),
    });
    await expect(requireVerifiedFirestoreUser(user, user)).rejects.toMatchObject({
      code: "auth/email-not-verified",
      message: VERIFY_EMAIL_BEFORE_CHAT_WRITE,
    });
  });

  test("accepts a user whose reload refreshes stale verification state", async () => {
    const user = authUser({ emailVerified: false });
    user.reload.mockImplementation(async () => {
      user.emailVerified = true;
    });
    await expect(requireVerifiedFirestoreUser(user, user)).resolves.toBe(user);
  });

  test("blocks stale or mismatched auth ownership", async () => {
    const requested = authUser();
    const active = authUser({ uid: "user-2" });
    await expect(requireVerifiedFirestoreUser(requested, active)).rejects.toMatchObject({
      code: "auth/user-mismatch",
    });
  });
});
