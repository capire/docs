---
status: released
---

# CAP Migration Tool

This interactive tool helps you identify migration steps needed when upgrading between different versions of the SAP Cloud Application Programming Model (CAP).

::: info Data Source
Migration data is sourced from [CAP Release Notes](https://cap.cloud.sap/docs/releases/).
:::

<ClientOnly>
  <MigrationTool />
</ClientOnly>

## How to Use

1. **Select Source Version** - Choose your current CAP version
2. **Select Target Version** - Choose the version you want to upgrade to  
3. **Show Migration Steps** - Click the button to display all relevant changes
4. **Filter & Search** - Use filters to focus on specific types of changes:
   - Breaking Changes
   - Requirements
   - Enhancements
5. **Export Checklist** - Download a markdown file with all migration steps

## Features

- **Version Range Selection**: Automatically identifies all migrations between any two versions
- **Smart Filtering**: Focus on what matters most to your project
- **Search**: Quickly find specific migrations by keyword
- **Export**: Generate a markdown checklist for documentation or team sharing
