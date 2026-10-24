/** Postgres SQLSTATE codes that actions turn into friendly messages. */
export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";

/** Custom codes raised by our triggers and RPCs (see the Phase 3 migration header). */
export const DB_UNIT_UNAVAILABLE = "BB001";
export const DB_TENANCY_FROZEN = "BB002";
export const DB_OCCUPANCY_MISMATCH = "BB003";
export const DB_NOT_FOUND = "BB004";
export const DB_ALREADY_LINKED = "BB005";
export const DB_CHARGE_VOID = "BB006";
export const DB_CHARGE_HAS_PAYMENTS = "BB007";
export const DB_OVERPAYMENT = "BB008";
export const DB_PAYMENT_ALREADY_VOID = "BB009";
export const DB_TOO_MANY_PHOTOS = "BB010";
export const DB_PHOTO_PATH_INVALID = "BB011";
export const DB_NOTICE_NEEDS_UNITS = "BB012";
export const DB_BILL_MONTH_OUTSIDE_TENANCY = "BB015";
export const DB_DOCUMENT_PATH_INVALID = "BB016";
export const DB_TOO_MANY_DOCUMENTS = "BB017";
export const DB_NOTICE_PUBLISHED = "BB018";
export const DB_SCHEDULE_NOT_FUTURE = "BB019";
export const DB_CLAIM_ALREADY_PENDING = "BB020";
export const DB_PAYMENT_IN_FUTURE = "BB021";
export const DB_CLAIM_ALREADY_REVIEWED = "BB022";
