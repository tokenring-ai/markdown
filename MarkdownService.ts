import type { TokenRingService } from "@tokenring-ai/app/types";
import { applyFixes, type LintError } from "markdownlint";
import { lint } from "markdownlint/promise";

export type MarkdownServiceConfig = {
  autoFix?: boolean;
  lint?: Record<string, unknown>;
};

export class MarkdownService implements TokenRingService {
  readonly name = "MarkdownService";
  readonly description = "A service that implements Markdown validation and linting using markdownlint.";

  private autoFix = false;
  private lintConfig: Record<string, unknown> = {};

  constructor(config?: MarkdownServiceConfig) {
    if (config) this.applyConfig(config);
  }

  reconfigure(config: MarkdownServiceConfig): void {
    this.applyConfig(config);
  }

  async validateFile(filePath: string, content: string): Promise<{ valid: boolean; result: string; content: string }> {
    const issues = await this.lintContent(filePath, content);
    const nextContent = this.autoFix && issues.length > 0 ? applyFixes(content, issues) : content;
    const remaining = nextContent === content ? issues : await this.lintContent(filePath, nextContent);

    if (remaining.length === 0) return { valid: true, result: "No issues found.", content: nextContent };

    return {
      valid: false,
      result: remaining.map(issue => this.formatIssue(issue)).join("\n"),
      content: nextContent,
    };
  }

  private applyConfig(config: MarkdownServiceConfig): void {
    this.autoFix = Boolean(config.autoFix);
    this.lintConfig = config.lint ?? {};
  }

  private async lintContent(filePath: string, content: string): Promise<LintError[]> {
    const results = await lint({
      config: this.lintConfig,
      strings: {
        [filePath]: content,
      },
    });

    return results[filePath] ?? [];
  }

  private formatIssue(issue: LintError): string {
    const column = issue.errorRange?.[0] ?? 1;
    const severity = issue.severity;
    const rule = issue.ruleNames.join("/");
    const detail = issue.errorDetail ? `: ${issue.errorDetail}` : "";
    const context = issue.errorContext ? ` (${issue.errorContext})` : "";

    return `${issue.lineNumber}:${column} ${severity} ${issue.ruleDescription}${detail}${context} (${rule})`;
  }
}
