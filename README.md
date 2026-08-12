# @tokenring-ai/markdown

## Overview

The `@tokenring-ai/markdown` package provides Markdown file validation for the
TokenRing ecosystem. It integrates with the FileSystemService and
AgentLifecycleService to automatically validate Markdown files using
`markdownlint`, surfacing style and formatting issues during file writes.

## Key Features

- `markdownlint`-based validation for Markdown content
- Automatic validation on file write via lifecycle hooks
- Error reporting with line, column, and severity information
- Support for `.md` and `.markdown` files
- Configurable lint rule overrides via plugin configuration

## Installation

```bash
bun add @tokenring-ai/markdown
```

### Dependencies

- `@tokenring-ai/app` (workspace:*)
- `@tokenring-ai/filesystem` (workspace:*)
- `@tokenring-ai/lifecycle` (workspace:*)
- `markdownlint` (^0.41.1)
- `zod` (^4.4.3)

## Chat Commands

This package does not define any chat commands.

## Tools

This package does not define any tools.

## Configuration

The plugin accepts configuration for markdownlint rule overrides:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `markdown.lint` | `Record<string, unknown>` | `{ "line-length": false, "table-column-style": false }` | markdownlint rule overrides, keyed by rule name |

### Sample Configuration

```yaml
markdown:
  lint:
    line-length: false
    table-column-style: false
    no-trailing-spaces: true
```

## Core Components

### MarkdownService

The `MarkdownService` is a TokenRingService that performs Markdown validation
using `markdownlint`. It is registered as an app service and can be required by
other components.

**Type Signature:**

```typescript
class MarkdownService implements TokenRingService {
  readonly name: string;
  readonly description: string;
  constructor(config?: Record<string, unknown>);
  validateFile(filePath: string, content: string): Promise<{ valid: boolean; result: string }>;
}
```

**Validation Result:**

```typescript
type FileValidationResult = {
  valid: boolean;
  result: string;
};
```

### markdownFileValidator Hook

The `markdownFileValidator` hook subscribes to the
`FileValidationAfterFileWrite` lifecycle event. When a Markdown file is written,
it automatically validates the content using `MarkdownService`.

**Hook Details:**

- **Name**: `markdownFileValidator`
- **Display Name**: `Markdown/Validate files after write`
- **Supported Extensions**: `.md`, `.markdown`
- **Trigger**: After file write operations

## Usage Examples

### Basic Plugin Installation

```typescript
import { TokenRingApp } from "@tokenring-ai/app";
import markdownPlugin from "@tokenring-ai/markdown/plugin";

const app = new TokenRingApp();

await app.install(markdownPlugin);
```

### Manual Service Usage

```typescript
import { MarkdownService } from "@tokenring-ai/markdown";

const service = new MarkdownService({
  "line-length": false,
  "table-column-style": false,
});

const content = `#Heading

This line has trailing spaces.
`;

const result = await service.validateFile("README.md", content);

if (!result.valid) {
  console.log(result.result);
}
```

## Error Handling

The validator returns formatted lint messages with location information:

**Error Format:**

```text
line:column severity ruleDescription: errorDetail (errorContext) (ruleNames)
```

**Example:**

```text
1:1 error No space after hash on atx style heading (MD018/no-missing-space-atx)
```

If no issues are found, the validator returns:

```typescript
{ valid: true, result: "No issues found." }
```

## Development

### Package Structure

```text
plugin/markdown/
├── index.ts                        # Package exports
├── plugin.ts                       # Plugin definition and installation
├── MarkdownService.ts              # Core validation service
├── hooks/
│   └── markdownFileValidator.ts    # Lifecycle hook for post-write validation
├── package.json                    # Package configuration
├── bun.config.ts                   # Bun test configuration
└── README.md                       # This documentation
```

## License

MIT License - see LICENSE file for details.
