import type { AuthResponse } from "@/types/api-types";
import type { IUser } from "@/types/prisma-generated";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
    if (!value || typeof value !== "object") { return null; }
    return value as UnknownRecord;
}

function pickUser(payload: UnknownRecord): IUser | null {
    const directUser = asRecord(payload.user) as IUser | null;
    if (directUser) { return directUser; }

    const data = asRecord(payload.data);
    if (!data) { return null; }

    const nestedUser = asRecord(data.user) as IUser | null;
    if (nestedUser) { return nestedUser; }

    return data as unknown as IUser;
}

function pickToken(payload: UnknownRecord, key: "accessToken" | "refreshToken"): string | undefined {
    const direct = payload[key];
    if (typeof direct === "string" && direct.length > 0) { return direct; }

    const data = asRecord(payload.data);
    if (!data) { return undefined; }
    const nested = data[key];
    return typeof nested === "string" && nested.length > 0 ? nested : undefined;
}

/** Backend sends composite refresh as `clientRefreshToken`; cookie name is `refreshToken`. */
function pickRefreshToken(payload: UnknownRecord): string | undefined {
    const asRefreshKey = pickToken(payload, "refreshToken");
    if (asRefreshKey) { return asRefreshKey; }

    const direct = payload.clientRefreshToken;
    if (typeof direct === "string" && direct.length > 0) { return direct; }

    const data = asRecord(payload.data);
    const nested = data?.clientRefreshToken;
    return typeof nested === "string" && nested.length > 0 ? nested : undefined;
}

export function normalizeAuthPayload(input: unknown): AuthResponse {
    const payload = asRecord(input);
    if (!payload) {
        throw new Error("Invalid auth response payload.");
    }

    const user = pickUser(payload);
    if (!user || !("id" in user)) {
        throw new Error("Auth response does not contain a valid user.");
    }

    return {
        user,
        accessToken: pickToken(payload, "accessToken"),
        refreshToken: pickRefreshToken(payload),
    };
}
