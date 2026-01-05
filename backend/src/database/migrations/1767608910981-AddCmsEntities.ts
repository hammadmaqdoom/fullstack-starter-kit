import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCmsEntities1767608910981 implements MigrationInterface {
    name = 'AddCmsEntities1767608910981'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "geo_settings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "countryCode" character varying(10) NOT NULL,
                "languageCode" character varying(10) NOT NULL,
                "region" character varying(50),
                "timezone" character varying(50),
                "currency" character varying(10),
                "hreflangConfig" jsonb,
                "regionalSchemaOverrides" jsonb,
                "regionalAnalyticsOverrides" jsonb,
                CONSTRAINT "PK_eb9a236adfbde84b662d4b6485d" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_6c61f32f89511584300f54f48a" ON "geo_settings" ("countryCode")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_5294ce1ce20727fa194828017f" ON "geo_settings" ("languageCode")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE TABLE "media" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "filename" character varying(255) NOT NULL,
                "url" character varying(500) NOT NULL,
                "mimeType" character varying(100),
                "fileSize" bigint,
                "width" integer,
                "height" integer,
                "altText" character varying(500),
                "caption" text,
                "title" character varying(500),
                "metadata" jsonb,
                "uploadedByUserId" uuid NOT NULL,
                CONSTRAINT "PK_f4e0fcac36e050de337b670d8bd" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_448ee4b78d3201fad33acf4665" ON "media" ("uploadedByUserId")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."navigation_menus_location_enum" AS ENUM('header', 'footer', 'sidebar', 'mobile')
        `);
        await queryRunner.query(`
            CREATE TABLE "navigation_menus" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "name" character varying(100) NOT NULL,
                "location" "public"."navigation_menus_location_enum" NOT NULL,
                "items" jsonb NOT NULL,
                "locale" character varying(10),
                "isActive" boolean NOT NULL DEFAULT true,
                "order" integer NOT NULL DEFAULT '0',
                CONSTRAINT "PK_cc28b3f55f02483595bb2f8cf50" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_8e2da3deb6999f4f604a095e4f" ON "navigation_menus" ("locale")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE TABLE "categories" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "name" character varying(255) NOT NULL,
                "slug" character varying(255) NOT NULL,
                "description" text,
                "parentId" uuid,
                CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_e9280c637b9a378c3bb3f7e36c" ON "categories" ("slug")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_074d8d43f749e8cdb70e006492" ON "categories" ("parentId")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE TABLE "content_versions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "contentId" uuid NOT NULL,
                "title" character varying(255) NOT NULL,
                "contentData" text NOT NULL,
                "excerpt" character varying(500),
                "metadata" jsonb,
                "versionNumber" character varying(100),
                "changeNote" text,
                CONSTRAINT "PK_77046b137eb8001947fc332e594" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_ee83173e046589b6685e8ce4a3" ON "content_versions" ("contentId")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."contents_type_enum" AS ENUM('blog', 'page', 'docs', 'changelog')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."contents_status_enum" AS ENUM('draft', 'review', 'published', 'archived')
        `);
        await queryRunner.query(`
            CREATE TABLE "contents" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "title" character varying(255) NOT NULL,
                "slug" character varying(255) NOT NULL,
                "content" text NOT NULL,
                "type" "public"."contents_type_enum" NOT NULL,
                "status" "public"."contents_status_enum" NOT NULL DEFAULT 'draft',
                "publishedAt" TIMESTAMP,
                "excerpt" character varying(500),
                "featuredImage" character varying(500),
                "readingTime" integer NOT NULL DEFAULT '0',
                "authorId" uuid NOT NULL,
                "categoryId" uuid,
                CONSTRAINT "PK_b7c504072e537532d7080c54fac" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_e85449cc9b71ee9efd5f21d1f2" ON "contents" ("title")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_e325daee4f07aa3f149f690648" ON "contents" ("slug")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_e3670a9de4d832a1eb67ab7600" ON "contents" ("authorId")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_ae921213a8029830d7fb24ad14" ON "contents" ("categoryId")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE TABLE "tags" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "name" character varying(100) NOT NULL,
                "slug" character varying(100) NOT NULL,
                "description" text,
                CONSTRAINT "PK_e7dc17249a1148a1970748eda99" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_2b201b08b0692368abd79db487" ON "tags" ("name")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_d54423c3d04020baac3da0bf33" ON "tags" ("slug")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."json_ld_schemas_schematype_enum" AS ENUM(
                'Organization',
                'WebSite',
                'WebPage',
                'BreadcrumbList',
                'Article',
                'BlogPosting',
                'NewsArticle',
                'TechArticle',
                'FAQPage',
                'HowTo',
                'LocalBusiness',
                'Product',
                'Service',
                'Review',
                'Rating',
                'Offer',
                'Event',
                'Course',
                'Recipe',
                'VideoObject',
                'ImageObject',
                'Person',
                'JobPosting'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "json_ld_schemas" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "schemaType" "public"."json_ld_schemas_schematype_enum" NOT NULL,
                "schemaData" jsonb NOT NULL,
                "contentId" uuid,
                "isGlobal" boolean NOT NULL DEFAULT false,
                CONSTRAINT "PK_364e2a491818d4db687b393f571" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_14d98a48d196524cf48bc7f984" ON "json_ld_schemas" ("contentId")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."structured_data_templates_schematype_enum" AS ENUM(
                'Organization',
                'WebSite',
                'WebPage',
                'BreadcrumbList',
                'Article',
                'BlogPosting',
                'NewsArticle',
                'TechArticle',
                'FAQPage',
                'HowTo',
                'LocalBusiness',
                'Product',
                'Service',
                'Review',
                'Rating',
                'Offer',
                'Event',
                'Course',
                'Recipe',
                'VideoObject',
                'ImageObject',
                'Person',
                'JobPosting'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "structured_data_templates" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "schemaType" "public"."structured_data_templates_schematype_enum" NOT NULL,
                "templateJSON" jsonb NOT NULL,
                "contentTypeMapping" character varying(100),
                "autoGenerate" boolean NOT NULL DEFAULT false,
                "isActive" boolean NOT NULL DEFAULT true,
                CONSTRAINT "PK_01cafa026338a2a0fb2014c991f" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "seo_metadata" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "contentId" uuid,
                "metaTitle" character varying(255),
                "metaDescription" text,
                "metaKeywords" character varying(500),
                "ogTitle" character varying(255),
                "ogDescription" text,
                "ogImage" character varying(500),
                "ogType" character varying(50),
                "ogUrl" character varying(255),
                "ogSiteName" character varying(100),
                "twitterCard" character varying(50),
                "twitterSite" character varying(100),
                "twitterCreator" character varying(100),
                "twitterImage" character varying(500),
                "canonicalUrl" character varying(500),
                "hreflang" jsonb,
                "customMeta" jsonb,
                CONSTRAINT "REL_e05cec73eb301fd82fc10a3856" UNIQUE ("contentId"),
                CONSTRAINT "PK_fcf814530fb2cd86a321cc134df" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_a7a686abf1dcf644578e2972f6" ON "seo_metadata" ("contentId")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."content_redirects_type_enum" AS ENUM('301', '302')
        `);
        await queryRunner.query(`
            CREATE TABLE "content_redirects" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "fromPath" character varying(500) NOT NULL,
                "toPath" character varying(500) NOT NULL,
                "type" "public"."content_redirects_type_enum" NOT NULL DEFAULT '301',
                "isActive" boolean NOT NULL DEFAULT true,
                CONSTRAINT "PK_0775569cde947fa8c2cabb8ccd7" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_95e4f98dcf02e0a1ee53076559" ON "content_redirects" ("fromPath")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."site_verification_platform_enum" AS ENUM(
                'GOOGLE',
                'BING',
                'YANDEX',
                'FACEBOOK',
                'PINTEREST'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "site_verification" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "platform" "public"."site_verification_platform_enum" NOT NULL,
                "verificationCode" character varying(255) NOT NULL,
                "metaTag" text,
                "isVerified" boolean NOT NULL DEFAULT false,
                "verifiedAt" TIMESTAMP,
                "lastChecked" TIMESTAMP,
                CONSTRAINT "PK_d2f15c527ada5bb187793aa6ef9" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_6b6a94bc93fb948bf7ab4d0fa3" ON "site_verification" ("platform")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."analytics_configs_platform_enum" AS ENUM(
                'GTM',
                'GA4',
                'FACEBOOK_PIXEL',
                'PINTEREST_TAG',
                'YANDEX_METRICA',
                'CUSTOM'
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."analytics_configs_environment_enum" AS ENUM('production', 'staging', 'development', 'all')
        `);
        await queryRunner.query(`
            CREATE TABLE "analytics_configs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "platform" "public"."analytics_configs_platform_enum" NOT NULL,
                "name" character varying(255) NOT NULL,
                "trackingId" character varying(255) NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "environment" "public"."analytics_configs_environment_enum" NOT NULL DEFAULT 'all',
                "additionalConfig" jsonb,
                "priority" integer NOT NULL DEFAULT '0',
                "createdByUserId" uuid,
                CONSTRAINT "PK_f341960f0fdf7216fde5e50bbf4" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_a0ba6cac21219d3be07de00974" ON "analytics_configs" ("platform")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_3cd902de1120e68cb86fc59c67" ON "analytics_configs" ("createdByUserId")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."feature_flags_environment_enum" AS ENUM('production', 'staging', 'development', 'all')
        `);
        await queryRunner.query(`
            CREATE TABLE "feature_flags" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "flagName" character varying(100) NOT NULL,
                "description" text,
                "isEnabled" boolean NOT NULL DEFAULT false,
                "environment" "public"."feature_flags_environment_enum" NOT NULL DEFAULT 'all',
                CONSTRAINT "PK_db657d344e9caacfc9d5cf8bbac" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_a6d70809d09f06647d2da8ed25" ON "feature_flags" ("flagName")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."custom_scripts_position_enum" AS ENUM(
                'head-start',
                'head-end',
                'body-start',
                'body-end'
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."custom_scripts_environment_enum" AS ENUM('production', 'staging', 'development', 'all')
        `);
        await queryRunner.query(`
            CREATE TABLE "custom_scripts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "name" character varying(255) NOT NULL,
                "scriptContent" text NOT NULL,
                "position" "public"."custom_scripts_position_enum" NOT NULL DEFAULT 'head-end',
                "targetPages" jsonb,
                "contentTypes" jsonb,
                "priority" integer NOT NULL DEFAULT '0',
                "isActive" boolean NOT NULL DEFAULT true,
                "environment" "public"."custom_scripts_environment_enum" NOT NULL DEFAULT 'all',
                "createdByUserId" uuid,
                CONSTRAINT "PK_3027e241f6f37a6c1aff435eb55" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_3a80670412f111ea4f08fbd2e0" ON "custom_scripts" ("createdByUserId")
            WHERE "deletedAt" IS NULL
        `);
        await queryRunner.query(`
            CREATE TABLE "content_tags" (
                "contentId" uuid NOT NULL,
                "tagId" uuid NOT NULL,
                CONSTRAINT "PK_f1c9b9d5fc7faac84b1ed0044c5" PRIMARY KEY ("contentId", "tagId")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_9d3853e9719ec8b82563d5cc2c" ON "content_tags" ("contentId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_141a13263ed357e11cc52235a0" ON "content_tags" ("tagId")
        `);
        await queryRunner.query(`
            ALTER TABLE "media"
            ADD CONSTRAINT "FK_908ef86fc2cbd3fd4b24f74129d" FOREIGN KEY ("uploadedByUserId") REFERENCES "user"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "categories"
            ADD CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "content_versions"
            ADD CONSTRAINT "FK_5ae2351d1653cc9e0daf0ca84ee" FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "contents"
            ADD CONSTRAINT "FK_21fa2829c68333e180618ecaae5" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "contents"
            ADD CONSTRAINT "FK_c59e928ccd0290a644b90d5bf60" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "json_ld_schemas"
            ADD CONSTRAINT "FK_8e5c9ddaf937f72d979dcc173f4" FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "seo_metadata"
            ADD CONSTRAINT "FK_e05cec73eb301fd82fc10a38560" FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "analytics_configs"
            ADD CONSTRAINT "FK_9e16230b66770c97f24843261d8" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "custom_scripts"
            ADD CONSTRAINT "FK_8b253c61e466e28284f1a65396f" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "content_tags"
            ADD CONSTRAINT "FK_9d3853e9719ec8b82563d5cc2ca" FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "content_tags"
            ADD CONSTRAINT "FK_141a13263ed357e11cc52235a03" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "content_tags" DROP CONSTRAINT "FK_141a13263ed357e11cc52235a03"
        `);
        await queryRunner.query(`
            ALTER TABLE "content_tags" DROP CONSTRAINT "FK_9d3853e9719ec8b82563d5cc2ca"
        `);
        await queryRunner.query(`
            ALTER TABLE "custom_scripts" DROP CONSTRAINT "FK_8b253c61e466e28284f1a65396f"
        `);
        await queryRunner.query(`
            ALTER TABLE "analytics_configs" DROP CONSTRAINT "FK_9e16230b66770c97f24843261d8"
        `);
        await queryRunner.query(`
            ALTER TABLE "seo_metadata" DROP CONSTRAINT "FK_e05cec73eb301fd82fc10a38560"
        `);
        await queryRunner.query(`
            ALTER TABLE "json_ld_schemas" DROP CONSTRAINT "FK_8e5c9ddaf937f72d979dcc173f4"
        `);
        await queryRunner.query(`
            ALTER TABLE "contents" DROP CONSTRAINT "FK_c59e928ccd0290a644b90d5bf60"
        `);
        await queryRunner.query(`
            ALTER TABLE "contents" DROP CONSTRAINT "FK_21fa2829c68333e180618ecaae5"
        `);
        await queryRunner.query(`
            ALTER TABLE "content_versions" DROP CONSTRAINT "FK_5ae2351d1653cc9e0daf0ca84ee"
        `);
        await queryRunner.query(`
            ALTER TABLE "categories" DROP CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa"
        `);
        await queryRunner.query(`
            ALTER TABLE "media" DROP CONSTRAINT "FK_908ef86fc2cbd3fd4b24f74129d"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_141a13263ed357e11cc52235a0"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_9d3853e9719ec8b82563d5cc2c"
        `);
        await queryRunner.query(`
            DROP TABLE "content_tags"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_3a80670412f111ea4f08fbd2e0"
        `);
        await queryRunner.query(`
            DROP TABLE "custom_scripts"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."custom_scripts_environment_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."custom_scripts_position_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_a6d70809d09f06647d2da8ed25"
        `);
        await queryRunner.query(`
            DROP TABLE "feature_flags"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."feature_flags_environment_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_3cd902de1120e68cb86fc59c67"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_a0ba6cac21219d3be07de00974"
        `);
        await queryRunner.query(`
            DROP TABLE "analytics_configs"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."analytics_configs_environment_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."analytics_configs_platform_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_6b6a94bc93fb948bf7ab4d0fa3"
        `);
        await queryRunner.query(`
            DROP TABLE "site_verification"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."site_verification_platform_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_95e4f98dcf02e0a1ee53076559"
        `);
        await queryRunner.query(`
            DROP TABLE "content_redirects"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."content_redirects_type_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_a7a686abf1dcf644578e2972f6"
        `);
        await queryRunner.query(`
            DROP TABLE "seo_metadata"
        `);
        await queryRunner.query(`
            DROP TABLE "structured_data_templates"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."structured_data_templates_schematype_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_14d98a48d196524cf48bc7f984"
        `);
        await queryRunner.query(`
            DROP TABLE "json_ld_schemas"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."json_ld_schemas_schematype_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_d54423c3d04020baac3da0bf33"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_2b201b08b0692368abd79db487"
        `);
        await queryRunner.query(`
            DROP TABLE "tags"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_ae921213a8029830d7fb24ad14"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_e3670a9de4d832a1eb67ab7600"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_e325daee4f07aa3f149f690648"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_e85449cc9b71ee9efd5f21d1f2"
        `);
        await queryRunner.query(`
            DROP TABLE "contents"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."contents_status_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."contents_type_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_ee83173e046589b6685e8ce4a3"
        `);
        await queryRunner.query(`
            DROP TABLE "content_versions"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_074d8d43f749e8cdb70e006492"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_e9280c637b9a378c3bb3f7e36c"
        `);
        await queryRunner.query(`
            DROP TABLE "categories"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_8e2da3deb6999f4f604a095e4f"
        `);
        await queryRunner.query(`
            DROP TABLE "navigation_menus"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."navigation_menus_location_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_448ee4b78d3201fad33acf4665"
        `);
        await queryRunner.query(`
            DROP TABLE "media"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_5294ce1ce20727fa194828017f"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_6c61f32f89511584300f54f48a"
        `);
        await queryRunner.query(`
            DROP TABLE "geo_settings"
        `);
    }

}
