import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateLink: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  createAdminClient: () => ({
    rpc: mocks.rpc,
    auth: {
      admin: {
        generateLink: mocks.generateLink,
      },
    },
  }),
}));

function buildRequest(body: { slug?: string; pin?: string }, ip = "127.0.0.1") {
  return new NextRequest("http://localhost/api/manager-mobile/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

async function loadPostHandler() {
  const routeModule = await import("./route");
  return routeModule.POST;
}

describe("POST /api/manager-mobile/login", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.rpc.mockReset();
    mocks.generateLink.mockReset();
  });

  it("rejects malformed PIN codes before calling Supabase", async () => {
    const POST = await loadPostHandler();

    const response = await POST(buildRequest({ slug: "farida", pin: "123" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Code PIN invalide." });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("blocks brute-force attempts after five failures on the same profile", async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    const POST = await loadPostHandler();

    for (let index = 0; index < 5; index += 1) {
      const response = await POST(buildRequest({ slug: "farida", pin: "123456" }, "10.0.0.8"));
      expect(response.status).toBe(401);
    }

    const blockedResponse = await POST(buildRequest({ slug: "farida", pin: "123456" }, "10.0.0.8"));

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.headers.get("Retry-After")).not.toBeNull();
    await expect(blockedResponse.json()).resolves.toEqual({
      error: "Trop de tentatives. Reessayez dans quelques minutes.",
    });
    expect(mocks.rpc).toHaveBeenCalledTimes(5);
  });

  it("returns a token hash when the manager PIN is valid", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ email: "manager@ep.fr", display_name: "Farida", first_login: false }],
      error: null,
    });
    mocks.generateLink.mockResolvedValue({
      data: {
        properties: {
          hashed_token: "hashed-token",
        },
      },
      error: null,
    });
    const POST = await loadPostHandler();

    const response = await POST(buildRequest({ slug: "farida", pin: "123456" }, "10.0.0.9"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      tokenHash: "hashed-token",
      email: "manager@ep.fr",
    });
    expect(mocks.generateLink).toHaveBeenCalledWith({
      type: "magiclink",
      email: "manager@ep.fr",
    });
  });
});
