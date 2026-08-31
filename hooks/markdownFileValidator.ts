import FileSystemService from "@tokenring-ai/filesystem/FileSystemService";
import { FileSystemState } from "@tokenring-ai/filesystem/state/fileSystemState";
import { FileValidationAfterFileWrite } from "@tokenring-ai/filesystem/util/runFileValidator";
import type { HookSubscription } from "@tokenring-ai/lifecycle/types";
import { HookCallback } from "@tokenring-ai/lifecycle/util/hooks";
import { MarkdownService } from "../MarkdownService";

const name = "markdownFileValidator";
const displayName = "Markdown/Validate files after write";
const description = "Automatically validates written markdown files using markdownlint";

const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);

const callbacks = [
  new HookCallback(FileValidationAfterFileWrite, async (data, agent) => {
    if (!MARKDOWN_EXTENSIONS.has(data.fileExtension)) {
      return null;
    }

    try {
      const { valid, result, content } = await agent.requireService(MarkdownService).validateFile(data.filePath, data.content);

      if (content !== data.content) {
        const fileSystem = agent.requireService(FileSystemService);
        await fileSystem.writeFile(data.filePath, content, agent);
        const updatedFileModificationTime = await fileSystem.getModifiedTimeNanos(data.filePath, agent);
        agent.mutateState(FileSystemState, state => {
          state.readFiles.set(data.filePath, updatedFileModificationTime || Date.now());
        });
      }

      return { valid, result };
    } catch (error: unknown) {
      return {
        valid: false,
        result: `Markdown validation error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }),
];
export default {
  name,
  displayName,
  description,
  callbacks,
} satisfies HookSubscription;
