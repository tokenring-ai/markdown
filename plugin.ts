import type { TokenRingPlugin } from "@tokenring-ai/app";
import { AgentLifecycleService } from "@tokenring-ai/lifecycle";
import { z } from "zod";
import markdownFileValidator from "./hooks/markdownFileValidator.ts";
import { MarkdownService } from "./MarkdownService.ts";
import packageJSON from "./package.json" with { type: "json" };

const packageConfigSchema = z.object({
  markdown: z
    .object({
      lint: z.record(z.string(), z.unknown()).prefault({
        "line-length": false,
        "table-column-style": false,
      }),
    })
    .prefault({}),
});

export default {
  name: packageJSON.name,
  displayName: "Markdown Tooling",
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    app.addServices(new MarkdownService(config.markdown.lint));

    // Register hooks with the lifecycle service
    app.waitForService(AgentLifecycleService, lifecycleService => {
      lifecycleService.addHooks(markdownFileValidator);
    });
  },
  config: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
