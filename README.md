# @tokenring-ai/markdown

Markdown file validation for agent-authored files, backed by `markdownlint`.

## Overview

The `@tokenring-ai/markdown` package adds Markdown file validation to TokenRing
applications. It registers a `MarkdownService` that lints Markdown content with
`markdownlint`, plus a `markdownFileValidator` lifecycle hook that runs as part
of the filesystem service's post-write validation pipeline: whenever an agent
writes a `.md` or `.markdown` file, the content is validated and any style or
formatting problems are surfaced in the file-write result.

### Key Features

- `markdownlint`-based validation of Markdown content
- Automatic validation on file write via the `FileValidationAfterFileWrite`
  lifecycle hook
- Error reporting with line, column, and severity information
- Support for `.md` and `.markdown` files
- Default rule overrides for `line-length` and `table-column-style`
- Configurable lint rule overrides, applied live through `reconfigure`

## Installation

```bash
bun add @tokenring-ai/markdown
```

## Chat Commands

This package does not define any chat commands.

## Tools

This package does not define any tools. Validation is triggered by the
filesystem post-write pipeline rather than by an agent-invoked tool.

## Configuration

The plugin accepts a single `markdown` configuration object containing a `lint`
map of `markdownlint` rule overrides, keyed by rule name:

```yaml
markdown:
  lint:
    line-length: false
    table-column-style: false
    no-trailing-spaces: true
    ul-style:
      style: dash
```

The whole `markdown` block is optional and defaults to `{}`. When `lint` is
absent it defaults to disabling `line-length` and `table-column-style`, so long
lines and narrow tables do not block writes out of the box.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `markdown` | `object` | no | `{}` | Markdown linting settings for agent-authored files |
| `markdown.lint` | `Record<string, unknown>` | no | `{ "line-length": false, "table-column-style": false }` | markdownlint rule overrides, keyed by rule name |

### Schema Metadata

The config schema attaches `.meta()` annotations for configuration UI
integration:

| Field | `.meta()` annotation |
|-------|----------------------|
| `markdown` | `{ label: "Markdown", description: "Markdown linting settings for agent-authored files" }` |
| `markdown.lint` | `{ label: "Lint Rules", advanced: true, description: "markdownlint rule overrides, keyed by rule name" }` |

## Core Components

### MarkdownService

The `MarkdownService` is a `TokenRingService` that validates Markdown content
with `markdownlint` and formats the resulting issues into human-readable
messages. It is registered as an app service during plugin installation and can
be required by other components.

**File:** `plugin/markdown/MarkdownService.ts`

**Type signature:**

```typescript
class MarkdownService implements TokenRingService {
  readonly name: string;
  readonly description: string;

  constructor(config?: Record<string, unknown>);
  reconfigure(config: Record<string, unknown>): void;
  validateFile(filePath: string, content: string): Promise<{ valid: boolean; result: string }>;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `name` | `"MarkdownService"` | Service identifier |
| `description` | `"A service that implements Markdown validation and linting using markdownlint."` | Service description |

| Method | Parameters | Description |
|--------|------------|-------------|
| `reconfigure` | `config: Record<string, unknown>` | Replaces the active markdownlint rule overrides |
| `validateFile` | `filePath: string, content: string` | Lints `content` (treated as the file `filePath`); resolves to `{ valid, result }` |

**Behavior:**

- The constructor accepts an optional map of markdownlint rule overrides and
  stores it in private state (default `{}` when omitted).
- `validateFile` calls `lint` from `markdownlint/promise` with the stored config
  and the content under the file path. With no issues it resolves to
  `{ valid: true, result: "No issues found." }`; otherwise it resolves to
  `{ valid: false, result }` where `result` is the formatted issues joined by
  newlines.
- `reconfigure` replaces the stored config; the plugin's `reconfigure` hook
  invokes it whenever the app config changes, so rule overrides take effect
  without a restart.

**Validation result** — the return shape matches `FileValidationResult` from
`@tokenring-ai/filesystem/util/runFileValidator` (minus the `null` variant):

```typescript
type FileValidationResult = {
  valid: boolean;
  result: string;
};
```

**Issue format** — each issue is formatted as:

```text
line:column severity ruleDescription: errorDetail (errorContext) (ruleNames)
```

where `column` defaults to `1`, `severity` defaults to `"error"`, and
`ruleNames` are joined with `/`. Example:

```text
1:1 error No space after hash on atx style heading (MD018/no-missing-space-atx)
```

## Services / Lifecycle Methods

### MarkdownService Registration

The service is registered during plugin installation with the default lint
overrides:

```typescript
const defaults = packageConfigSchema.parse({});
app.addService(new MarkdownService(defaults.markdown.lint));
```

Other components can require it by type:

```typescript
const service = agent.requireService(MarkdownService);
const result = await service.validateFile("README.md", content);
```

### Plugin Lifecycle

The plugin (`plugin/markdown/plugin.ts`) defines `install` and `reconfigure`
and declares a `configSchema`, so config changes are applied live through
`PluginManager.reconfigurePlugins()`.

| Field | Value |
|-------|-------|
| `name` | `@tokenring-ai/markdown` (from `package.json`) |
| `displayName` | `Markdown Tooling` |
| `version` | `0.2.0` (from `package.json`) |
| `description` | `Markdown file validation using markdownlint integration with FileSystemService.` |
| `configSchema` | `z.object({ markdown: z.object({ lint: ... }).prefault({}) })` |

- **`install(app)`** — computes the default config with
  `packageConfigSchema.parse({})`, registers `MarkdownService` with the default
  lint overrides via `app.addService(...)`, then, once `AgentLifecycleService`
  is available (`app.waitForService(...)`), registers the
  `markdownFileValidator` hook subscription via
  `lifecycleService.addHooks(markdownFileValidator)`.
- **`reconfigure(app, config)`** — calls
  `app.requireService(MarkdownService).reconfigure(config.markdown.lint)`,
  replacing the active lint rule overrides. Because the plugin declares a
  `configSchema` and a `reconfigure` hook, `markdown.lint` changes are applied
  live without an app restart.

```typescript
import type { TokenRingPlugin } from "@tokenring-ai/app";
import { AgentLifecycleService } from "@tokenring-ai/lifecycle";
import { z } from "zod";
import markdownFileValidator from "./hooks/markdownFileValidator.ts";
import { MarkdownService } from "./MarkdownService.ts";
import packageJSON from "./package.json" with { type: "json" };

const packageConfigSchema = z.object({
  markdown: z
    .object({
      lint: z
        .record(z.string(), z.unknown())
        .prefault({
          "line-length": false,
          "table-column-style": false,
        })
        .meta({ label: "Lint Rules", advanced: true, description: "markdownlint rule overrides, keyed by rule name" }),
    })
    .prefault({})
    .meta({ label: "Markdown", description: "Markdown linting settings for agent-authored files" }),
});

export default {
  name: packageJSON.name,
  displayName: "Markdown Tooling",
  version: packageJSON.version,
  description: packageJSON.description,
  install(app) {
    const defaults = packageConfigSchema.parse({});
    app.addService(new MarkdownService(defaults.markdown.lint));

    app.waitForService(AgentLifecycleService, lifecycleService => {
      lifecycleService.addHooks(markdownFileValidator);
    });
  },
  reconfigure(app, config) {
    app.requireService(MarkdownService).reconfigure(config.markdown.lint);
  },
    configSchema: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
```

### Lifecycle Hooks

#### markdownFileValidator

**File:** `plugin/markdown/hooks/markdownFileValidator.ts`

| Property | Value |
|----------|-------|
| Name | `markdownFileValidator` |
| Display Name | `Markdown/Validate files after write` |
| Description | `Automatically validates written markdown files using markdownlint` |
| Trigger | `FileValidationAfterFileWrite` (from `@tokenring-ai/filesystem/util/runFileValidator`) |

When the filesystem service runs its post-write validator, the hook receives a
`FileValidationAfterFileWrite` event carrying `filePath`, `fileExtension`, and
`content`. For `.md` and `.markdown` extensions it validates the content with
`MarkdownService` and returns the `FileValidationResult`; for any other
extension it returns `null` (skip):

```typescript
const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);

const callbacks = [
  new HookCallback(FileValidationAfterFileWrite, (data, agent) => {
    if (MARKDOWN_EXTENSIONS.has(data.fileExtension)) {
      return agent.requireService(MarkdownService).validateFile(data.filePath, data.content);
    }
    return null;
  }),
];
```

The hook is registered under the name `markdownFileValidator`, so it is keyed by
that constant and can be toggled per agent through `AgentLifecycleService`:

```typescript
import { AgentLifecycleService } from "@tokenring-ai/lifecycle";

const lifecycleService = agent.getService(AgentLifecycleService);

// Disable automatic markdown validation for this agent
lifecycleService?.disableHooks(["markdownFileValidator"], agent);

// Re-enable it
lifecycleService?.enableHooks(["markdownFileValidator"], agent);
```

## Usage Examples

### Installing the Plugin

```typescript
import TokenRingApp from "@tokenring-ai/app";
import PluginManager from "@tokenring-ai/app/PluginManager";
import markdownPlugin from "@tokenring-ai/markdown/plugin";

const app = new TokenRingApp({
  app: {
    workingDirectory: "/home/user/.tokenring",
    workspaceDirectory: "/home/user/projects/demo",
    configDirectories: [],
  },
});

const pluginManager = app.addService(new PluginManager(app));
await pluginManager.installPlugins([markdownPlugin]);
```

### Manual Service Usage

```typescript
import { MarkdownService } from "@tokenring-ai/markdown";

const service = new MarkdownService({
  "line-length": false,
  "table-column-style": false,
});

// Valid Markdown — no issues
const valid = await service.validateFile("guide.md", "# Guide\n\nA paragraph.\n");
// { valid: true, result: "No issues found." }

// An atx heading without a space after the hash triggers MD018
const invalid = await service.validateFile("guide.md", "#Guide\n");
// { valid: false, result: "1:1 error No space after hash on atx style heading (MD018/no-missing-space-atx)" }
```

### Custom Lint Configuration

```typescript
import { MarkdownService } from "@tokenring-ai/markdown";

const service = new MarkdownService({
  "line-length": false,
  "no-trailing-spaces": true,
  "ul-style": { style: "dash" },
});

const result = await service.validateFile("docs/guide.md", markdownContent);
```

### Reconfiguring Lint Rules at Runtime

```typescript
import { MarkdownService } from "@tokenring-ai/markdown";

const service = new MarkdownService({ "line-length": false });

service.reconfigure({
  "line-length": false,
  "no-trailing-spaces": true,
});
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `@tokenring-ai/app` (workspace:*) | `TokenRingPlugin` / `TokenRingService` interfaces and the app service registry (`addService`, `waitForService`) |
| `@tokenring-ai/filesystem` (workspace:*) | `FileValidationAfterFileWrite` hook class and `FileValidationResult` types from the post-write pipeline |
| `@tokenring-ai/lifecycle` (workspace:*) | `AgentLifecycleService` hook registration and per-agent toggling |
| `markdownlint` (^0.41.1) | Markdown linting engine (`lint` from `markdownlint/promise`) |
| `zod` (^4.4.3) | Config schema validation and `.meta()` annotations |

**Dev dependency:** `typescript` (^7.0.2) for type checking.

## Testing

```bash
bun test              # run all tests
bun test --watch      # watch mode
bun test --coverage   # with coverage
```

`bun.config.ts` configures the Bun test runner
(`include: ["**/*.test.ts"]`, `environment: "node"`). The package currently
ships no test files, so `bun test` reports no tests; the `build` script runs
`tsc --noEmit` for type checking.

## License

MIT License — see LICENSE file for details.
