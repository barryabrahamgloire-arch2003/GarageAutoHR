import { garageOf, loadPlatform } from "./store";
import type { Account, Platform } from "./platform";
import { readCookie, SESSION_COOKIE, verifySession, type SessionToken } from "./session";

export interface Principal {
  platform: Platform;
  token: SessionToken;
  real: Account;
  account: Account;
}

export async function principalFrom(request: Request): Promise<Principal | null> {
  const token = verifySession(readCookie(request.headers.get("cookie"), SESSION_COOKIE));
  if (!token) return null;
  const platform = await loadPlatform();
  const real = platform.accounts.find((account) => account.id === (token.impersonatorId ?? token.accountId) && account.active);
  if (!real) return null;
  if (token.impersonatorId && real.role !== "superadmin") return null;
  const account = token.impersonatorId
    ? platform.accounts.find((item) => item.id === token.accountId && item.active)
    : real;
  if (!account) return null;
  return { platform, token, real, account };
}

export function profileOf(principal: Principal) {
  const garage = garageOf(principal.platform, principal.account.garageId);
  return {
    accountId: principal.account.id,
    name: principal.account.name,
    email: principal.account.email,
    role: principal.account.role,
    garageId: principal.account.garageId,
    garageName: garage?.name ?? "Auto HR",
    staffId: principal.account.staffId,
    clientId: principal.account.clientId,
    impersonating: Boolean(principal.token.impersonatorId),
    impersonatorName: principal.token.impersonatorId ? principal.real.name : null,
  };
}
