/** Fired by src/instrumentation-client.ts when a navigation to another page starts (heard by TopLoader). */
export const NAV_START_EVENT = "tarzans:navstart"

/** Fired by LogoutButton when the client signs out, so pages showing their data clear it at once. */
export const SESSION_ENDED_EVENT = "tarzans:session-ended"

/** Ends the top loading bar when something finished without changing the URL. */
export const NAV_DONE_EVENT = "tarzans:navdone"
