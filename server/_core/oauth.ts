import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  app.get("/api/oauth/login", (req: Request, res: Response) => {
    const redirectUri = getQueryParam(req, "redirect_uri") || btoa("http://localhost:3000/");
    const oauthServerUrl = process.env.OAUTH_SERVER_URL || "https://auth.manus.im";
    const appId = process.env.MANUS_APP_ID || "";

    if (!appId) {
      res.status(500).json({ error: "MANUS_APP_ID not configured" });
      return;
    }

    const loginUrl = new URL(`${oauthServerUrl}/oauth/authorize`);
    loginUrl.searchParams.set("client_id", appId);
    loginUrl.searchParams.set("response_type", "code");
    loginUrl.searchParams.set("redirect_uri", `${process.env.APP_URL || "http://localhost:3000"}/api/oauth/callback`);
    loginUrl.searchParams.set("state", redirectUri);
    loginUrl.searchParams.set("scope", "openid profile email");

    res.redirect(loginUrl.toString());
  });

  app.post("/api/oauth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.json({ success: true });
  });
}
