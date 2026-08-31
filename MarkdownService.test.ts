import { describe, expect, it } from "bun:test";
import { MarkdownService } from "./MarkdownService.ts";

const headingWithoutSpace = "#Heading\n";
const headingWithSpace = "# Heading\n";

describe("MarkdownService", () => {
  it("reports unfixed issues when autoFix is disabled", async () => {
    const service = new MarkdownService({
      lint: { "line-length": false, "table-column-style": false },
    });

    const result = await service.validateFile("guide.md", headingWithoutSpace);

    expect(result.valid).toBe(false);
    expect(result.content).toBe(headingWithoutSpace);
    expect(result.result).toContain("MD018");
  });

  it("applies markdownlint fixes when autoFix is enabled", async () => {
    const service = new MarkdownService({
      autoFix: true,
      lint: { "line-length": false, "table-column-style": false },
    });

    const result = await service.validateFile("guide.md", headingWithoutSpace);

    expect(result.content).toBe(headingWithSpace);
    expect(result.valid).toBe(true);
    expect(result.result).toBe("No issues found.");
  });

  it("reports leftover issues that autoFix cannot resolve", async () => {
    const service = new MarkdownService({
      autoFix: true,
      lint: { "line-length": false, "table-column-style": false },
    });

    const result = await service.validateFile("guide.md", "[missing]( )\n");

    expect(result.valid).toBe(false);
    expect(result.result).toContain("MD042");
  });

  it("picks up autoFix after reconfigure", async () => {
    const service = new MarkdownService({
      lint: { "line-length": false, "table-column-style": false },
    });

    service.reconfigure({
      autoFix: true,
      lint: { "line-length": false, "table-column-style": false },
    });

    const result = await service.validateFile("guide.md", headingWithoutSpace);

    expect(result.content).toBe(headingWithSpace);
    expect(result.valid).toBe(true);
  });
});
