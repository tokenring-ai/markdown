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
    app.addServices(new MarkdownService());

    // Register hooks with the lifecycle service
    app.waitForService(AgentLifecycleService, lifecycleService => {
      lifecycleService.addHooks(markdownFileValidator);
    });
  },
  reconfigure(app, config) {
    app.requireService(MarkdownService).reconfigure(config.markdown.lint);
  },
  configSchema: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
