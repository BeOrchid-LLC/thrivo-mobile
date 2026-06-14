import { useSessionStore } from "../session.store";

describe("Phase 3 — session store", () => {
  beforeEach(() => {
    useSessionStore.getState().actions.clearSession();
  });

  it("starts unauthenticated after clear", () => {
    const state = useSessionStore.getState();
    expect(state.status).toBe("unauthenticated");
    expect(state.token).toBeNull();
    expect(state.userId).toBeNull();
  });

  it("setSession marks the user authenticated with session facts", () => {
    useSessionStore
      .getState()
      .actions.setSession({ token: "tok_1", userId: "u_1", isOnboarded: true });
    const state = useSessionStore.getState();
    expect(state.status).toBe("authenticated");
    expect(state.token).toBe("tok_1");
    expect(state.userId).toBe("u_1");
    expect(state.isOnboarded).toBe(true);
  });

  it("clearSession wipes the token and resets onboarding", () => {
    const { actions } = useSessionStore.getState();
    actions.setSession({ token: "tok_1", userId: "u_1", isOnboarded: true });
    actions.clearSession();
    const state = useSessionStore.getState();
    expect(state.status).toBe("unauthenticated");
    expect(state.token).toBeNull();
    expect(state.isOnboarded).toBe(false);
  });

  it("action references are stable across updates", () => {
    const first = useSessionStore.getState().actions;
    useSessionStore.getState().actions.setStatus("loading");
    const second = useSessionStore.getState().actions;
    expect(first).toBe(second);
  });
});
