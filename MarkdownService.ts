import type { TokenRingService } from "@tokenring-ai/app/types";
import { lint } from "markdownlint/promise";

type MarkdownlintIssue = {
  lineNumber: number;
  ruleNames: string[];
  ruleDescription: string;
  errorDetail: string | null;
  errorContext: string | null;
  errorRange: [number, number] | null;
  severity?: string | undefined;
};

export class MarkdownService implements TokenRingService {
  readonly name = "MarkdownService";
  readonly description = "A service that implements Markdown validation and linting using markdownlint.";

  private config: Record<string, unknown> = {};

  constructor(config?: Record<string, unknown>) {
    if (config) this.config = config;
  }

  reconfigure(config: Record<string, unknown>): void {
    this.config = config;
  }

  async validateFile(filePath: string, content: string): Promise<{ valid: boolean; result: string }> {
    const results = await lint({
      config: this.config,
      strings: {
        [filePath]: content,
      },
    });

    const issues = (results[filePath] ?? []) as MarkdownlintIssue[];

    if (issues.length === 0) return { valid: true, result: "No issues found." };

    const result = issues.map(issue => this.formatIssue(issue)).join("\n");
    return { valid: false, result };
  }

  private formatIssue(issue: MarkdownlintIssue): string {
    const column = issue.errorRange?.[0] ?? 1;
    const severity = issue.severity ?? "error";
    const rule = issue.ruleNames.join("/");
    const detail = issue.errorDetail ? `: ${issue.errorDetail}` : "";
    const context = issue.errorContext ? ` (${issue.errorContext})` : "";

    return `${issue.lineNumber}:${column} ${severity} ${issue.ruleDescription}${detail}${context} (${rule})`;
  }
}
