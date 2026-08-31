import type { TokenRingPlugin } from "@tokenring-ai/app";
import type { ConfigFieldMeta } from "@tokenring-ai/app/config/metadata";
import { AgentLifecycleService } from "@tokenring-ai/lifecycle";
import { z } from "zod";
import markdownFileValidator from "./hooks/markdownFileValidator.ts";
import { MarkdownService } from "./MarkdownService.ts";
import packageJSON from "./package.json" with { type: "json" };

const packageConfigSchema = z.object({
  markdown: z
    .object({
      autoFix: z
        .boolean()
        .prefault(true)
        .meta({ label: "Auto-apply Fixes", description: "Automatically apply automatic markdown fixes after a file is written" } satisfies ConfigFieldMeta),
      lint: z
        .record(z.string(), z.unknown())
        .prefault({
          "line-length": false,
          "table-column-style": false,
        })
        .meta({ label: "Lint Rules", advanced: true, description: "markdownlint rule overrides, keyed by rule name" } satisfies ConfigFieldMeta),
    })
    .prefault({})
    .meta({ label: "Markdown", description: "Markdown linting settings for agent-authored files" } satisfies ConfigFieldMeta),
});

export default {
  name: packageJSON.name,
  displayName: "Markdown Tooling",
  version: packageJSON.version,
  description: packageJSON.description,
  install(app) {
    const defaults = packageConfigSchema.parse({});
    app.addService(MarkdownService, new MarkdownService(defaults.markdown));

    // Register hooks with the lifecycle service
    app.waitForService(AgentLifecycleService, lifecycleService => {
      lifecycleService.addHooks(markdownFileValidator);
    });
  },
  reconfigure(app, config) {
    app.requireService(MarkdownService).reconfigure(config.markdown);
  },
  configSchema: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
