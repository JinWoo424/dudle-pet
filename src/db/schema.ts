import {
  bigint,
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const geography = customType<{ data: string }>({ dataType: () => "geography(Point,4326)" });

export const regionLevel = pgEnum("region_level", ["PROVINCE", "CITY", "DISTRICT"]);
export const facilityType = pgEnum("facility_type", ["ANIMAL_HOSPITAL", "ANIMAL_PHARMACY", "PET_FUNERAL", "PET_GROOMING", "PET_BOARDING", "PET_TRANSPORT", "PET_CAFE"]);
export const businessStatus = pgEnum("business_status", ["OPEN", "CLOSED", "TEMP_CLOSED", "SUSPENDED", "UNKNOWN"]);
export const geoStatus = pgEnum("geo_status", ["VALID", "MISSING", "INVALID", "REVIEW_REQUIRED"]);
export const regionStatus = pgEnum("region_status", ["MATCHED", "UNMATCHED", "REVIEW_REQUIRED"]);
export const triState = pgEnum("tri_state", ["YES", "NO", "UNKNOWN"]);
export const verificationStatus = pgEnum("verification_status", ["VALID", "EXPIRING", "EXPIRED", "UNVERIFIED"]);
export const verificationSource = pgEnum("verification_source", ["PUBLIC_DATA", "OFFICIAL_WEBSITE", "OFFICIAL_SOCIAL", "PHONE_CONFIRMATION", "KAKAO_PLACE", "NAVER_PLACE", "ADMIN_MANUAL", "USER_REPORT_CONFIRMED"]);
export const processingStatus = pgEnum("processing_status", ["PENDING", "PROCESSED", "FAILED", "HELD_ANOMALY"]);
export const syncStatus = pgEnum("sync_status", ["RUNNING", "SUCCESS", "PARTIAL", "FAILED", "BLOCKED_ANOMALY"]);
export const reportType = pgEnum("report_type", ["CLOSED", "WRONG_PHONE", "WRONG_ADDRESS", "WRONG_HOURS", "WRONG_24H", "WRONG_SERVICE", "OTHER"]);
export const reportStatus = pgEnum("report_status", ["NEW", "UNDER_REVIEW", "RESOLVED", "REJECTED"]);
export const seoStatus = pgEnum("seo_status", ["SEO_READY", "NOINDEX_LOW_DATA", "NOINDEX_DUPLICATE", "NOINDEX_MANUAL"]);
export const monetizationStatus = pgEnum("monetization_status", ["FULL", "LIMITED", "OFF"]);
export const guideStatus = pgEnum("guide_status", ["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const feeRegionLevel = pgEnum("fee_region_level", ["NATIONAL", "PROVINCE", "CITY"]);
export const animalType = pgEnum("animal_type", ["DOG", "CAT", "ALL", "NOT_APPLICABLE"]);
export const weightClass = pgEnum("weight_class", ["KG_5", "KG_10", "KG_20", "NOT_APPLICABLE"]);

const auditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  parentId: integer("parent_id"),
  level: regionLevel("level").notNull(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  slug: text("slug").notNull(),
  fullSlug: text("full_slug").notNull(),
  provinceCode: text("province_code"),
  cityCode: text("city_code"),
  centerLatitude: real("center_latitude"),
  centerLongitude: real("center_longitude"),
  hospitalCount: integer("hospital_count").default(0).notNull(),
  pharmacyCount: integer("pharmacy_count").default(0).notNull(),
  funeralCount: integer("funeral_count").default(0).notNull(),
  activeFacilityCount: integer("active_facility_count").default(0).notNull(),
  ...auditColumns,
}, (table) => [uniqueIndex("regions_full_slug_uq").on(table.fullSlug), index("regions_parent_idx").on(table.parentId)]);

export const facilities = pgTable("facilities", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityType: facilityType("facility_type").notNull(),
  publicSource: text("public_source").notNull(),
  publicSourceId: text("public_source_id").notNull(),
  publicLocalCode: text("public_local_code"),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  phoneRaw: text("phone_raw"),
  phoneNormalized: text("phone_normalized"),
  roadAddress: text("road_address"),
  jibunAddress: text("jibun_address"),
  postalCode: text("postal_code"),
  regionId: integer("region_id").references(() => regions.id),
  province: text("province"),
  city: text("city"),
  district: text("district"),
  legalDong: text("legal_dong"),
  publicStatusCode: text("public_status_code"),
  publicStatusName: text("public_status_name"),
  publicDetailStatusCode: text("public_detail_status_code"),
  publicDetailStatusName: text("public_detail_status_name"),
  businessStatus: businessStatus("business_status").default("UNKNOWN").notNull(),
  licenseDate: date("license_date"),
  licenseCancelDate: date("license_cancel_date"),
  closedDate: date("closed_date"),
  temporaryCloseStart: date("temporary_close_start"),
  temporaryCloseEnd: date("temporary_close_end"),
  reopenDate: date("reopen_date"),
  sourceX: text("source_x"),
  sourceY: text("source_y"),
  sourceCrs: text("source_crs").default("EPSG:5174"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  location: geography("location"),
  geoStatus: geoStatus("geo_status").default("MISSING").notNull(),
  regionStatus: regionStatus("region_status").default("UNMATCHED").notNull(),
  sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  dataQualityScore: integer("data_quality_score").default(0).notNull(),
  missingStreak: integer("missing_streak").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...auditColumns,
}, (table) => [
  uniqueIndex("facilities_source_id_uq").on(table.publicSource, table.publicSourceId),
  index("facilities_region_type_idx").on(table.regionId, table.facilityType, table.isActive),
  index("facilities_normalized_name_idx").on(table.normalizedName),
]);

export const facilityFeatures = pgTable("facility_features", {
  id: uuid("id").defaultRandom().primaryKey(),
  facilityId: uuid("facility_id").references(() => facilities.id, { onDelete: "cascade" }).notNull(),
  open24h: triState("open_24h").default("UNKNOWN").notNull(),
  nightService: triState("night_service").default("UNKNOWN").notNull(),
  emergencyService: triState("emergency_service").default("UNKNOWN").notNull(),
  dogService: triState("dog_service").default("UNKNOWN").notNull(),
  catService: triState("cat_service").default("UNKNOWN").notNull(),
  rabbitService: triState("rabbit_service").default("UNKNOWN").notNull(),
  hamsterService: triState("hamster_service").default("UNKNOWN").notNull(),
  birdService: triState("bird_service").default("UNKNOWN").notNull(),
  reptileService: triState("reptile_service").default("UNKNOWN").notNull(),
  exoticService: triState("exotic_service").default("UNKNOWN").notNull(),
  parkingAvailable: triState("parking_available").default("UNKNOWN").notNull(),
  ctAvailable: triState("ct_available").default("UNKNOWN").notNull(),
  mriAvailable: triState("mri_available").default("UNKNOWN").notNull(),
  homepageUrl: text("homepage_url"),
  reservationUrl: text("reservation_url"),
  verificationStatus: verificationStatus("verification_status").default("UNVERIFIED").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  ...auditColumns,
}, (table) => [uniqueIndex("facility_features_facility_uq").on(table.facilityId)]);

export const facilityVerifications = pgTable("facility_verifications", {
  id: uuid("id").defaultRandom().primaryKey(), facilityId: uuid("facility_id").references(() => facilities.id, { onDelete: "cascade" }).notNull(),
  fieldName: text("field_name").notNull(), fieldValue: text("field_value").notNull(), sourceType: verificationSource("source_type").notNull(),
  sourceUrl: text("source_url"), evidenceNote: text("evidence_note"), verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
  verifiedBy: text("verified_by"), expiresAt: timestamp("expires_at", { withTimezone: true }), ...auditColumns,
}, (table) => [index("facility_verifications_facility_idx").on(table.facilityId, table.fieldName)]);

export const facilityHours = pgTable("facility_hours", {
  id: uuid("id").defaultRandom().primaryKey(), facilityId: uuid("facility_id").references(() => facilities.id, { onDelete: "cascade" }).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), openTime: time("open_time"), closeTime: time("close_time"), breakStart: time("break_start"), breakEnd: time("break_end"),
  is24h: boolean("is_24h").default(false).notNull(), isClosed: boolean("is_closed").default(false).notNull(), sourceType: verificationSource("source_type").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(), ...auditColumns,
}, (table) => [uniqueIndex("facility_hours_day_uq").on(table.facilityId, table.dayOfWeek)]);

export const sourceRawRecords = pgTable("source_raw_records", {
  id: uuid("id").defaultRandom().primaryKey(), sourceType: text("source_type").notNull(), facilityType: facilityType("facility_type").notNull(),
  externalId: text("external_id").notNull(), payloadJson: jsonb("payload_json").notNull(), sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(), checksum: text("checksum").notNull(), processingStatus: processingStatus("processing_status").default("PENDING").notNull(),
  processingError: text("processing_error"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("raw_source_external_checksum_uq").on(table.sourceType, table.externalId, table.checksum)]);

export const syncRuns = pgTable("sync_runs", {
  id: uuid("id").defaultRandom().primaryKey(), sourceType: text("source_type").notNull(), startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }), status: syncStatus("status").default("RUNNING").notNull(), requestedCount: integer("requested_count").default(0).notNull(),
  receivedCount: integer("received_count").default(0).notNull(), createdCount: integer("created_count").default(0).notNull(), updatedCount: integer("updated_count").default(0).notNull(),
  unchangedCount: integer("unchanged_count").default(0).notNull(), failedCount: integer("failed_count").default(0).notNull(), errorMessage: text("error_message"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const facilityChanges = pgTable("facility_changes", {
  id: uuid("id").defaultRandom().primaryKey(), facilityId: uuid("facility_id").references(() => facilities.id).notNull(), fieldName: text("field_name").notNull(),
  oldValue: text("old_value"), newValue: text("new_value"), sourceType: text("source_type").notNull(), detectedAt: timestamp("detected_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const feeImportBatches = pgTable("fee_import_batches", {
  id: uuid("id").defaultRandom().primaryKey(), surveyYear: integer("survey_year").notNull(), sourceName: text("source_name").notNull(), sourceUrl: text("source_url"), fileName: text("file_name").notNull(),
  fileHash: text("file_hash").notNull(), importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow().notNull(), importedBy: text("imported_by").notNull(), rowCount: integer("row_count").default(0).notNull(),
  successCount: integer("success_count").default(0).notNull(), failedCount: integer("failed_count").default(0).notNull(), status: text("status").notNull(), notes: text("notes"),
});

export const medicalFeeStatistics = pgTable("medical_fee_statistics", {
  id: uuid("id").defaultRandom().primaryKey(), surveyYear: integer("survey_year").notNull(), regionLevel: feeRegionLevel("region_level").notNull(), regionId: integer("region_id").references(() => regions.id),
  province: text("province"), city: text("city"), categoryCode: text("category_code").notNull(), itemCode: text("item_code").notNull(), itemName: text("item_name").notNull(),
  animalType: animalType("animal_type").default("NOT_APPLICABLE").notNull(), weightClass: weightClass("weight_class").default("NOT_APPLICABLE").notNull(), unit: text("unit").default("원").notNull(),
  minimumPrice: integer("minimum_price"), medianPrice: integer("median_price"), averagePrice: integer("average_price"), maximumPrice: integer("maximum_price"), sampleCount: integer("sample_count"),
  sourceName: text("source_name").notNull(), sourceUrl: text("source_url"), sourceDate: date("source_date"), importBatchId: uuid("import_batch_id").references(() => feeImportBatches.id), ...auditColumns,
}, (table) => [uniqueIndex("fee_stats_dimension_uq").on(table.surveyYear, table.regionLevel, table.regionId, table.itemCode, table.animalType, table.weightClass)]);

export const userReports = pgTable("user_reports", {
  id: uuid("id").defaultRandom().primaryKey(), facilityId: uuid("facility_id").references(() => facilities.id).notNull(), reportType: reportType("report_type").notNull(), message: text("message").notNull(),
  contactEmail: text("contact_email"), status: reportStatus("status").default("NEW").notNull(), adminNote: text("admin_note"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const seoPages = pgTable("seo_pages", {
  id: uuid("id").defaultRandom().primaryKey(), pageType: text("page_type").notNull(), facilityType: facilityType("facility_type"), regionId: integer("region_id").references(() => regions.id), featureType: text("feature_type"),
  resultCount: integer("result_count").default(0).notNull(), pageQualityScore: integer("page_quality_score").default(0).notNull(), seoStatus: seoStatus("seo_status").default("NOINDEX_LOW_DATA").notNull(),
  monetizationStatus: monetizationStatus("monetization_status").default("OFF").notNull(), canonicalUrl: text("canonical_url").notNull(), generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  lastEvaluatedAt: timestamp("last_evaluated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("seo_pages_canonical_uq").on(table.canonicalUrl)]);

export const guides = pgTable("guides", {
  id: uuid("id").defaultRandom().primaryKey(), title: text("title").notNull(), slug: text("slug").notNull(), summary: text("summary").notNull(), body: text("body").notNull(), category: text("category").notNull(),
  status: guideStatus("status").default("DRAFT").notNull(), seoTitle: text("seo_title"), seoDescription: text("seo_description"), publishedAt: timestamp("published_at", { withTimezone: true }), ...auditColumns,
}, (table) => [uniqueIndex("guides_slug_uq").on(table.slug)]);

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(), admin: text("admin").notNull(), action: text("action").notNull(), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(),
  beforeJson: jsonb("before_json"), afterJson: jsonb("after_json"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const seoKeywordMetrics = pgTable("seo_keyword_metrics", {
  id: uuid("id").defaultRandom().primaryKey(), keyword: text("keyword").notNull(), pageType: text("page_type").notNull(), regionId: integer("region_id").references(() => regions.id),
  searchVolume: integer("search_volume"), cpc: integer("cpc"), competition: real("competition"), impressions: bigint("impressions", { mode: "number" }), clicks: bigint("clicks", { mode: "number" }), ctr: real("ctr"),
  position: real("position"), adsenseRpm: integer("adsense_rpm"), opportunityScore: real("opportunity_score"), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

