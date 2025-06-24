CREATE TABLE IF NOT EXISTS "McpServer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"transportType" varchar DEFAULT 'stdio' NOT NULL,
	"command" text,
	"args" json,
	"env" json,
	"url" text,
	"maxRetries" integer DEFAULT 3 NOT NULL,
	"retryDelay" integer DEFAULT 1000 NOT NULL,
	"timeout" integer DEFAULT 30000 NOT NULL,
	"isEnabled" boolean DEFAULT true NOT NULL,
	"connectionStatus" varchar DEFAULT 'disconnected' NOT NULL,
	"lastConnected" timestamp,
	"lastError" text,
	"serverInfo" json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "McpTool" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"serverId" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"inputSchema" json,
	"outputSchema" json,
	"isEnabled" boolean DEFAULT true NOT NULL,
	"lastUsed" timestamp,
	"usageCount" integer DEFAULT 0 NOT NULL,
	"averageExecutionTime" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "McpToolExecution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"toolId" uuid NOT NULL,
	"chatId" uuid NOT NULL,
	"messageId" uuid NOT NULL,
	"input" json,
	"output" json,
	"executionTime" integer,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"error" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "McpServer" ADD CONSTRAINT "McpServer_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "McpTool" ADD CONSTRAINT "McpTool_serverId_McpServer_id_fk" FOREIGN KEY ("serverId") REFERENCES "public"."McpServer"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "McpToolExecution" ADD CONSTRAINT "McpToolExecution_toolId_McpTool_id_fk" FOREIGN KEY ("toolId") REFERENCES "public"."McpTool"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "McpToolExecution" ADD CONSTRAINT "McpToolExecution_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "McpToolExecution" ADD CONSTRAINT "McpToolExecution_messageId_Message_v2_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."Message_v2"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
