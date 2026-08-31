import { beforeEach, describe, expect, it, mock } from "bun:test";
import FileSystemService from "@tokenring-ai/filesystem/FileSystemService";
import { FileValidationAfterFileWrite } from "@tokenring-ai/filesystem/util/runFileValidator";
import type { HookSubscription } from "@tokenring-ai/lifecycle/types";
import { MarkdownService } from "../MarkdownService.ts";
import markdownFileValidator from "./markdownFileValidator.ts";

describe("markdownFileValidator hook", () => {
  const validateFile = mock(async () => ({ valid: true, result: "No issues found.", content: "# Heading\n" }));
  const writeFile = mock(async () => true);
  const getModifiedTimeNanos = mock(async () => 123);
  const mutateState = mock(() => undefined);
  const mockAgent = {
    requireService: mock((service: unknown) => {
      if (service === MarkdownService) return { validateFile };
      if (service === FileSystemService) return { writeFile, getModifiedTimeNanos };
      throw new Error("unexpected service");
    }),
    mutateState,
  } as any;

  beforeEach(() => {
    validateFile.mockReset();
    validateFile.mockResolvedValue({ valid: true, result: "No issues found.", content: "# Heading\n" });
    writeFile.mockReset();
    writeFile.mockResolvedValue(true);
    getModifiedTimeNanos.mockReset();
    getModifiedTimeNanos.mockResolvedValue(123);
    mutateState.mockReset();
    mockAgent.requireService.mockClear();
  });

  it("exports the expected subscription metadata", () => {
    const hook: HookSubscription = markdownFileValidator;
    expect(hook.name).toBe("markdownFileValidator");
    expect(hook.displayName).toBe("Markdown/Validate files after write");
    expect(hook.description).toContain("markdownlint");
    expect(Array.isArray(hook.callbacks)).toBe(true);
  });

  it("validates markdown extensions and writes auto-fixed content", async () => {
    const callback = markdownFileValidator.callbacks.find(cb => cb.hookConstructor === FileValidationAfterFileWrite);
    expect(callback).toBeDefined();

    const data = new FileValidationAfterFileWrite("docs/guide.md", ".md", "#Heading\n");
    const result = await callback!.callback(data, mockAgent);

    expect(validateFile).toHaveBeenCalledWith("docs/guide.md", "#Heading\n");
    expect(writeFile).toHaveBeenCalledWith("docs/guide.md", "# Heading\n", mockAgent);
    expect(result).toEqual({ valid: true, result: "No issues found." });
  });

  it("does not rewrite the file when content is unchanged", async () => {
    validateFile.mockResolvedValueOnce({ valid: true, result: "No issues found.", content: "# Heading\n" });

    const callback = markdownFileValidator.callbacks.find(cb => cb.hookConstructor === FileValidationAfterFileWrite);
    const data = new FileValidationAfterFileWrite("docs/guide.md", ".md", "# Heading\n");
    const result = await callback!.callback(data, mockAgent);

    expect(writeFile).not.toHaveBeenCalled();
    expect(result).toEqual({ valid: true, result: "No issues found." });
  });

  it("returns null for non-markdown extensions", async () => {
    const callback = markdownFileValidator.callbacks.find(cb => cb.hookConstructor === FileValidationAfterFileWrite);
    const data = new FileValidationAfterFileWrite("src/file.ts", ".ts", "const x = 1;");
    const result = await callback!.callback(data, mockAgent);

    expect(result).toBeNull();
    expect(validateFile).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("returns a validation failure when validateFile throws", async () => {
    validateFile.mockRejectedValueOnce(new Error("markdownlint crashed"));

    const callback = markdownFileValidator.callbacks.find(cb => cb.hookConstructor === FileValidationAfterFileWrite);
    const data = new FileValidationAfterFileWrite("docs/guide.md", ".md", "# Heading\n");
    const result = await callback!.callback(data, mockAgent);

    expect(result).toEqual({
      valid: false,
      result: "Markdown validation error: markdownlint crashed",
    });
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("stringifies non-Error throw values", async () => {
    validateFile.mockRejectedValueOnce("boom");

    const callback = markdownFileValidator.callbacks.find(cb => cb.hookConstructor === FileValidationAfterFileWrite);
    const data = new FileValidationAfterFileWrite("docs/guide.md", ".md", "# Heading\n");
    const result = await callback!.callback(data, mockAgent);

    expect(result).toEqual({
      valid: false,
      result: "Markdown validation error: boom",
    });
  });
});
