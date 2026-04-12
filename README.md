# @tokenring-ai/markdown

## Overview

The `@tokenring-ai/markdown` package provides Markdown file validation for the
TokenRing ecosystem. It integrates with the FileSystemService to register
`markdownlint`-based validation for Markdown files, surfacing style and
formatting issues during file writes and edits.

## Key Features

- `markdownlint`-based validation for Markdown content
- FileSystemService integration for automatic validation
- Error reporting with line and column information
- Support for `.md` and `.markdown` files
- Automatic loading of a root `.markdownlint.json` when present

## Installation

```bash
bun add @tokenring-ai/markdown
```

### Dependencies

- `@tokenring-ai/app` (0.2.0)
- `@tokenring-ai/filesystem` (0.2.0)
- `markdownlint` (^0.40.0)
- `zod` (^4.3.6)

## Core Components

### MarkdownFileValidator

The core file validator implementation runs `markdownlint` against Markdown
content and returns formatted issues.

**Type Signature:**

```typescript
type FileValidator = (filePath: string, content: string) => Promise<string | null>;
```

**Supported File Extensions:**

- `.md` - Standard Markdown files
- `.markdown` - Alternate Markdown file extension

### Plugin

The plugin registers Markdown file validators with the FileSystemService.

**Plugin Configuration:**

- No configuration options required
- Automatically registers validators for all supported Markdown extensions

## Usage Examples

### Basic Plugin Installation

```typescript
import {TokenRingApp} from "@tokenring-ai/app";
import markdownPlugin from "@tokenring-ai/markdown/plugin";

const app = new TokenRingApp();

await app.install(markdownPlugin);
```

### Manual Validator Usage

```typescript
import MarkdownFileValidator from "@tokenring-ai/markdown/MarkdownFileValidator";

const content = `
#Heading

This line has trailing spaces.  
`;

const issues = await MarkdownFileValidator("README.md", content);

if (issues) {
  console.log(issues);
}
```

### Integration With FileSystemService

```typescript
fileSystemService.registerFileValidator(".md", MarkdownFileValidator);
fileSystemService.registerFileValidator(
  ".markdown",
  MarkdownFileValidator
);
```

## Configuration

The `@tokenring-ai/markdown` package requires no plugin configuration:

```typescript
const packageConfigSchema = z.object({});
```

If a `.markdownlint.json` file exists at the project root, it is loaded
automatically and passed to `markdownlint`.

## Error Handling

The validator returns formatted lint messages with location information:

**Error Format:**

```text
line:column severity message (rule)
```

**Example:**

```text
1:2 error No space after hash on atx style heading
  (MD018/no-missing-space-atx)
```

If no issues are found, the validator returns `null`.

## Development

### Package Structure

```text
pkg/markdown/
├── index.ts                  # Package exports
├── plugin.ts                 # Plugin definition and installation
├── MarkdownFileValidator.ts  # Core validator implementation
├── package.json              # Package configuration
├── vitest.config.ts          # Test configuration
└── README.md                 # This documentation
```

## License

MIT License - see LICENSE file for details.
