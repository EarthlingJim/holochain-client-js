import { CapClaim, ZomeCallCapGrant } from "./capabilities.js";
import { AgentPubKey } from "../types.js";
import { CounterSigningSessionData } from "./countersigning.js";

export type EntryVisibility = { Public: null } | { Private: null };
export type AppEntryDef = {
  entry_index: number;
  zome_index: number;
  visibility: EntryVisibility;
};

export type EntryType =
  | "Agent"
  | { App: AppEntryDef }
  | "CapClaim"
  | "CapGrant";

export interface EntryContent<E extends string, C> {
  entry_type: E;
  entry: C;
}

export type Entry =
  | EntryContent<"Agent", AgentPubKey>
  | EntryContent<"App", Uint8Array>
  | EntryContent<"CounterSign", [CounterSigningSessionData, Uint8Array]>
  | EntryContent<"CapGrant", ZomeCallCapGrant>
  | EntryContent<"CapClaim", CapClaim>;
