import type {FileValidator} from "@tokenring-ai/filesystem/FileSystemService";
import {lint} from "markdownlint/promise";

type MarkdownlintIssue = {
  lineNumber: number;
  ruleNames: string[];
  ruleDescription: string;
  errorDetail: string | null;
  errorContext: string | null;
  errorRange: [number, number] | null;
  severity?: string;
};

export class MarkdownFileValidator implements FileValidator {
  private readonly config: Record<string, unknown> | undefined;

  constructor(config: Record<string, unknown>) {
    this.config = config;
  }

  private formatIssue(issue: MarkdownlintIssue): string {
    const column = issue.errorRange?.[0] ?? 1;
    const severity = issue.severity ?? "error";
    const rule = issue.ruleNames.join("/");
    const detail = issue.errorDetail ? `: ${issue.errorDetail}` : "";
    const context = issue.errorContext ? ` (${issue.errorContext})` : "";

    return `${issue.lineNumber}:${column} ${severity} ${issue.ruleDescription}${detail}${context} (${rule})`;
  }

  async validateFile(filePath: string, content: string) : Promise<string|null> {
    const results = await lint({
      config: this.config,
      strings: {
        [filePath]: content,
      },
    });

    const issues = (results[filePath] ?? []) as MarkdownlintIssue[];

    if (issues.length === 0) return null;

    return issues.map((issue) => this.formatIssue(issue)).join("\n");
  }
}