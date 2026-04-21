import type { TokenRingPlugin } from "@tokenring-ai/app";
import FileSystemService from "@tokenring-ai/filesystem/FileSystemService";
import { z } from "zod";
import { MarkdownFileValidator } from "./MarkdownFileValidator.ts";
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

const MARKDOWN_EXTENSIONS = [".md", ".markdown"];

export default {
  name: packageJSON.name,
  displayName: "Markdown Tooling",
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    app.waitForService(FileSystemService, fileSystemService => {
      const validator = new MarkdownFileValidator(config.markdown.lint);

      for (const ext of MARKDOWN_EXTENSIONS) {
        fileSystemService.registerFileValidator(ext, validator);
      }
    });
  },
  config: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
