CREATE TABLE IF NOT EXISTS "MCPServer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"iconUrl" text,
	"transportType" varchar NOT NULL,
	"transportConfig" json NOT NULL,
	"schemaConfig" json,
	"createdByUserId" uuid,
	"isPublic" boolean DEFAULT false NOT NULL,
	"isCurated" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "UserMCPConfig" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"mcpServerId" uuid NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"encryptedCredentials" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "UserMCPToolConfig" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"mcpServerId" uuid NOT NULL,
	"toolName" varchar(100) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "MCPServer" ADD CONSTRAINT "MCPServer_createdByUserId_User_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserMCPConfig" ADD CONSTRAINT "UserMCPConfig_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserMCPConfig" ADD CONSTRAINT "UserMCPConfig_mcpServerId_MCPServer_id_fk" FOREIGN KEY ("mcpServerId") REFERENCES "public"."MCPServer"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserMCPToolConfig" ADD CONSTRAINT "UserMCPToolConfig_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UserMCPToolConfig" ADD CONSTRAINT "UserMCPToolConfig_mcpServerId_MCPServer_id_fk" FOREIGN KEY ("mcpServerId") REFERENCES "public"."MCPServer"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
