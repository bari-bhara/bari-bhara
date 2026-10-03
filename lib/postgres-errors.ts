/** Postgres SQLSTATE codes that actions turn into friendly messages. */
export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";

/** Custom codes raised by our triggers and RPCs (see the Phase 3 migration header). */
export const DB_UNIT_UNAVAILABLE = "BB001";
export const DB_TENANCY_FROZEN = "BB002";
export const DB_OCCUPANCY_MISMATCH = "BB003";
export const DB_NOT_FOUND = "BB004";
export const DB_ALREADY_LINKED = "BB005";
