import { FileValidationAfterFileWrite } from "@tokenring-ai/filesystem/util/runFileValidator";
import type { HookSubscription } from "@tokenring-ai/lifecycle/types";
import { HookCallback } from "@tokenring-ai/lifecycle/util/hooks";
import { MarkdownService } from "../MarkdownService";

const name = "markdownFileValidator";
const displayName = "Markdown/Validate files after write";
const description = "Automatically validates written markdown files using markdownlint";

const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);

const callbacks = [
  new HookCallback(FileValidationAfterFileWrite, (data, agent) => {
    if (MARKDOWN_EXTENSIONS.has(data.fileExtension)) {
      return agent.requireService(MarkdownService).validateFile(data.filePath, data.content);
    }
    return null;
  }),
];
export default {
  name,
  displayName,
  description,
  callbacks,
} satisfies HookSubscription;
