# AEM HTL / Sightly Support for VS Code

> ⚠️ **Work In Progress** 
> 
> This extension is currently under active development. Certain features might be incomplete or subject to change.

This extension provides rich language support for Adobe Experience Manager (AEM) HTL (Sightly) files in Visual Studio Code.

## Features

- **Syntax Highlighting**: Specifically designed to safely overlay standard HTML syntax, highlighting:
  - `${...}` HTL expressions
  - Variables, logical operators, and standard AEM objects within expressions.
  - `@` context and format options.
  
- **Autocomplete & Intellisense**:
  - `data-sly-*` block tags.
  - **Java Models**: Press `ctrl+space` while typing `data-sly-use.model="..."` to dynamically search and autocomplete Java classes within your workspace.
  - **Implicit Objects**: Suggests standard AEM implicit objects (`properties`, `currentPage`, `resource`, etc.) inside expressions.
  - **Model Properties**: When typing `myModel.`, dynamically resolves the underlying Java class and suggests its getters/properties.
  - **Dialog Properties**: When typing `properties.`, auto-discovers and parses nearby `_cq_dialog/.content.xml` configurations to suggest component dialog fields.
  - **Context Options**: Suggests standard HTL options when typing `@ ` inside an expression (e.g., `context`, `format`, `i18n`).

- **Navigation**:
  - `ctrl+click` (Go to Definition) on a fully-qualified Java path within `data-sly-use` to instantly open the corresponding `.java` model file.

## Requirements

The extension is designed to run in workspaces containing AEM projects (like `ui.apps` and `core` modules mapping to Java and XML).

## Known Issues

- Complex Java class structures (like deeply nested loops or extremely complex inheritances) might occasionally fail simple regex-based property extraction.

## Release Notes

### 0.0.1
Initial Alpha release.
