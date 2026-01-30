#!/usr/bin/env node

import { Command } from 'commander';
import { getClient } from './port_client';
import {
  generateActionImports,
  generateBlueprintImports,
  generateScorecardImports,
  generateIntegrationImports,
  generateWebhookImports,
  generatePageImports,
  generateFolderImports,
  generateEntityImports,
  generateAggregationPropertyImports,
  writeImportBlocksToFile,
  detectMigrationWarnings,
  MigrationWarnings,
  AutoFixResult,
  FilterOptions,
  applyPageAutoFixes,
  applyBlueprintAutoFixes,
  buildDependencyGraph,
  filterIntegrations,
  filterBlueprints,
  filterPages,
  generateFixScript,
  generateMigrationReport,
} from './tf_import_block_generator';

const fs = require('fs');
const { execSync, spawnSync } = require('child_process');

const program = new Command();

program
  .name('port-tf-import')
  .description('Generate Terraform import blocks for Port entities')
  .option('-b, --export-entities-for-blueprints <ids>', 'Comma-separated list of blueprint IDs to fetch entities for', (val) => val.split(',').map(bp => bp.trim()).filter(Boolean))
  .option('-p, --provider-alias <alias>', 'Terraform provider alias to use in import blocks (default: port-labs, can also be set via PORT_PROVIDER_ALIAS env var)')
  .option('-m, --migration-mode', 'Enable migration mode with warnings for common migration issues')
  .option('--auto-fix', 'Automatically fix known issues during generation (entity page types, null relation titles, page ordering)')
  .option('--exclude-github-integrations', 'Exclude GitHub integrations from import (they require manual reconfiguration)')
  .option('--exclude-system-blueprints', 'Exclude system blueprints (_* prefixed) from import')
  .option('--exclude-ai-pages', 'Exclude pages containing AI agent widgets')
  .option('--exclude <patterns...>', 'Pattern-based exclusion (e.g., "integration:GitHub-*" "page:_*")')
  .option('--generate-fix-script', 'Generate fix_generated.sh with sed commands for remaining issues')
  .option('--report', 'Generate migration_report.md with summary of exported resources and issues')
  .option('--terraform', 'Run terraform plan -generate-config-out=generated.tf and apply fixes automatically')
  .parse(process.argv);

const options = program.opts();

function displayMigrationWarnings(warnings: MigrationWarnings, autoFixApplied: boolean): void {
  const hasWarnings = Object.values(warnings).some(arr => arr.length > 0);

  if (!hasWarnings) {
    console.log('\n=== Migration Warnings ===\n');
    console.log('No migration warnings detected.\n');
    return;
  }

  console.log('\n=== Migration Warnings ===\n');

  // GitHub Integrations
  if (warnings.githubIntegrations.length > 0) {
    console.log(`GitHub Integrations (${warnings.githubIntegrations.length} found):`);
    const displayItems = warnings.githubIntegrations.slice(0, 10);
    displayItems.forEach(w => console.log(`  - ${w.resourceId}`));
    if (warnings.githubIntegrations.length > 10) {
      console.log(`  ... and ${warnings.githubIntegrations.length - 10} more`);
    }
    console.log('  Note: GitHub integrations use installation IDs specific to each org.');
    console.log('        If the installation ID differs, you\'ll need to reconfigure.\n');
  }

  // System Blueprints
  if (warnings.systemBlueprints.length > 0) {
    console.log(`System Blueprints (${warnings.systemBlueprints.length} found):`);
    const displayItems = warnings.systemBlueprints.slice(0, 10);
    console.log(`  - ${displayItems.map(w => w.resourceId).join(', ')}`);
    if (warnings.systemBlueprints.length > 10) {
      console.log(`  ... and ${warnings.systemBlueprints.length - 10} more`);
    }
    console.log('  Note: System blueprints cannot be created via Terraform.');
    console.log('        They must already exist in target or be manually imported.\n');
  }

  // AI Agent Pages
  if (warnings.aiAgentPages.length > 0) {
    console.log(`AI Agent Pages (${warnings.aiAgentPages.length} found):`);
    const displayItems = warnings.aiAgentPages.slice(0, 10);
    displayItems.forEach(w => console.log(`  - ${w.resourceId}`));
    if (warnings.aiAgentPages.length > 10) {
      console.log(`  ... and ${warnings.aiAgentPages.length - 10} more`);
    }
    console.log('  Note: Pages with AI agent widgets may fail due to missing agentIdentifier.');
    console.log('        Consider removing from Terraform management or manually configuring.\n');
  }

  // Page Ordering Issues
  if (warnings.pageOrdering.length > 0) {
    console.log(`Page Ordering Issues (${warnings.pageOrdering.length} found):`);
    const displayItems = warnings.pageOrdering.slice(0, 10);
    displayItems.forEach(w => console.log(`  - ${w.message}`));
    if (warnings.pageOrdering.length > 10) {
      console.log(`  ... and ${warnings.pageOrdering.length - 10} more`);
    }
    if (autoFixApplied) {
      console.log('  Status: Auto-fixed (set after = null for affected pages)\n');
    } else {
      console.log('  Note: Set \'after\' to null in generated.tf or ensure referenced pages exist.\n');
    }
  }

  // Blueprint Relation Titles
  if (warnings.relationTitles.length > 0) {
    console.log(`Blueprint Relation Titles (${warnings.relationTitles.length} found):`);
    const displayItems = warnings.relationTitles.slice(0, 10);
    displayItems.forEach(w => console.log(`  - ${w.resourceId} has null title`));
    if (warnings.relationTitles.length > 10) {
      console.log(`  ... and ${warnings.relationTitles.length - 10} more`);
    }
    if (autoFixApplied) {
      console.log('  Status: Auto-fixed (defaulted titles from relation key names)\n');
    } else {
      console.log('  Note: Null relation titles cause provider drift. Explicitly set titles');
      console.log('        in generated.tf to avoid repeated terraform plan changes.\n');
    }
  }

  // Automation Triggers
  if (warnings.automationTriggers.length > 0) {
    console.log(`Automation Triggers (${warnings.automationTriggers.length} found):`);
    const displayItems = warnings.automationTriggers.slice(0, 10);
    displayItems.forEach(w => console.log(`  - ${w.resourceId}`));
    if (warnings.automationTriggers.length > 10) {
      console.log(`  ... and ${warnings.automationTriggers.length - 10} more`);
    }
    console.log('  Note: Actions with automation_trigger may need userInputs configuration.');
    console.log('        Review and manually configure if terraform apply fails.\n');
  }

  // Entity Page Types
  if (warnings.entityPageTypes.length > 0) {
    console.log(`Entity Page Types (${warnings.entityPageTypes.length} found):`);
    const displayItems = warnings.entityPageTypes.slice(0, 10);
    displayItems.forEach(w => console.log(`  - ${w.resourceId}`));
    if (warnings.entityPageTypes.length > 10) {
      console.log(`  ... and ${warnings.entityPageTypes.length - 10} more`);
    }
    if (autoFixApplied) {
      console.log('  Status: Auto-fixed (transformed to "blueprint-entities")\n');
    } else {
      console.log('  Note: Pages with type "entity" must be changed to "blueprint-entities"');
      console.log('        in generated.tf. Terraform only accepts: blueprint-entities, dashboard, home.');
      console.log('');
      console.log('  Run this command to fix automatically:');
      console.log('    sed -i \'\' \'s/type *= *"entity"/type = "blueprint-entities"/g\' generated.tf');
      console.log('');
      console.log('  Or on Linux:');
      console.log('    sed -i \'s/type *= *"entity"/type = "blueprint-entities"/g\' generated.tf\n');
    }
  }
}

function displayAutoFixSummary(fixes: AutoFixResult): void {
  const totalFixes = fixes.entityPageTypesFixed.length +
                     fixes.relationTitlesFixed.length +
                     fixes.pageOrderingFixed.length;

  if (totalFixes === 0) {
    return;
  }

  console.log('\n=== Auto-Fixes Applied ===\n');

  if (fixes.entityPageTypesFixed.length > 0) {
    console.log(`Entity Page Types Fixed (${fixes.entityPageTypesFixed.length}):`);
    fixes.entityPageTypesFixed.forEach(id => console.log(`  - ${id}: "entity" -> "blueprint-entities"`));
    console.log('');
  }

  if (fixes.pageOrderingFixed.length > 0) {
    console.log(`Page Ordering Fixed (${fixes.pageOrderingFixed.length}):`);
    fixes.pageOrderingFixed.forEach(id => console.log(`  - ${id}: after set to null`));
    console.log('');
  }

  if (fixes.relationTitlesFixed.length > 0) {
    console.log(`Relation Titles Fixed (${fixes.relationTitlesFixed.length}):`);
    fixes.relationTitlesFixed.forEach(fix => {
      console.log(`  - ${fix.blueprint}.${fix.relation}: null -> "${fix.newTitle}"`);
    });
    console.log('');
  }
}

async function main() {
  const blueprintIdentifiers: string[] = options.exportEntitiesForBlueprints || [];
  const providerAlias = options.providerAlias || process.env.PORT_PROVIDER_ALIAS || 'port-labs';
  const migrationMode = options.migrationMode || false;
  const autoFix = options.autoFix || false;
  const generateFixScriptFlag = options.generateFixScript || false;
  const generateReport = options.report || false;
  const runTerraform = options.terraform || false;
  const PORT_CLIENT_ID = process.env.PORT_CLIENT_ID;
  const PORT_CLIENT_SECRET = process.env.PORT_CLIENT_SECRET;
  const PORT_BASE_URL = process.env.PORT_BASE_URL || 'https://api.getport.io';

  // Build filter options from CLI flags
  const filterOptions: FilterOptions = {
    excludeGithubIntegrations: options.excludeGithubIntegrations || false,
    excludeSystemBlueprints: options.excludeSystemBlueprints || false,
    excludeAiPages: options.excludeAiPages || false,
    excludePatterns: options.exclude || [],
  };

  if (!PORT_CLIENT_ID || !PORT_CLIENT_SECRET) {
    console.log('Please provide env vars PORT_CLIENT_ID and PORT_CLIENT_SECRET');
    process.exit(0);
  }

  try {
    const client = await getClient();
    console.log('fetching actions');
    const actions = await client.get('/actions?version=v2');
    console.log('fetching blueprints');
    const blueprints = await client.get('/blueprints');
    console.log('fetching scorecards');
    const scorecards = await client.get('/scorecards');
    console.log('fetching integrations');
    const integrations = await client.get('/integration');
    console.log('fetching webhooks');
    const webhooks = await client.get('/webhooks');
    console.log('fetching pages');
    const pages = await client.get('/pages');
    console.log('fetching folders');
    const folders = await client.get('/sidebars/catalog');

    let allEntities: any[] = [];

    if (blueprintIdentifiers.length > 0) {
      for (const blueprintId of blueprintIdentifiers) {
        if (blueprintId.startsWith('_')) {
          console.log(`Skipping system blueprint "${blueprintId}" - system blueprints are handled separately`);
          continue;
        }
        console.log(`fetching entities for blueprint: ${blueprintId}`);
        try {
          const res = await client.get(`/blueprints/${blueprintId}/entities`);
          if (Array.isArray(res.entities)) {
            allEntities = allEntities.concat(res.entities);
          } else {
            console.warn(`No valid entities array returned for blueprint: ${blueprintId}`);
          }
        } catch (err) {
          if (err instanceof Error) {
            console.error(`Failed to fetch entities for blueprint "${blueprintId}":`, err.message);
          } else {
            console.error(`Failed to fetch entities for blueprint "${blueprintId}":`, err);
          }
        }
      }
    }

    // Apply filters
    let filteredIntegrations = filterIntegrations(integrations.integrations, filterOptions);
    let filteredBlueprints = filterBlueprints(blueprints.blueprints, filterOptions);
    let filteredPages = filterPages(pages.pages, filterOptions);

    // Track auto-fixes
    let autoFixes: AutoFixResult = {
      entityPageTypesFixed: [],
      relationTitlesFixed: [],
      pageOrderingFixed: [],
    };

    // Apply auto-fixes if enabled
    if (autoFix) {
      console.log('applying auto-fixes');

      // Build set of imported page IDs for page ordering fix
      const importedPageIds = new Set<string>();
      filteredPages.forEach(page => {
        if (!page.identifier.startsWith('$') && !page.identifier.startsWith('_')) {
          importedPageIds.add(page.identifier);
        }
      });

      // Apply page auto-fixes
      const pageFixResult = applyPageAutoFixes(filteredPages, importedPageIds);
      filteredPages = pageFixResult.pages;
      autoFixes.entityPageTypesFixed = pageFixResult.fixes.entityPageTypesFixed;
      autoFixes.pageOrderingFixed = pageFixResult.fixes.pageOrderingFixed;

      // Apply blueprint auto-fixes
      const blueprintFixResult = applyBlueprintAutoFixes(filteredBlueprints);
      filteredBlueprints = blueprintFixResult.blueprints;
      autoFixes.relationTitlesFixed = blueprintFixResult.fixes.relationTitlesFixed;
    }

    // Log filter summary if any filters applied
    const originalCounts = {
      integrations: integrations.integrations.length,
      blueprints: blueprints.blueprints.length,
      pages: pages.pages.length,
    };
    const filteredCounts = {
      integrations: filteredIntegrations.length,
      blueprints: filteredBlueprints.length,
      pages: filteredPages.length,
    };

    if (originalCounts.integrations !== filteredCounts.integrations ||
        originalCounts.blueprints !== filteredCounts.blueprints ||
        originalCounts.pages !== filteredCounts.pages) {
      console.log('\n=== Filtering Applied ===');
      if (originalCounts.integrations !== filteredCounts.integrations) {
        console.log(`  Integrations: ${originalCounts.integrations} -> ${filteredCounts.integrations} (${originalCounts.integrations - filteredCounts.integrations} excluded)`);
      }
      if (originalCounts.blueprints !== filteredCounts.blueprints) {
        console.log(`  Blueprints: ${originalCounts.blueprints} -> ${filteredCounts.blueprints} (${originalCounts.blueprints - filteredCounts.blueprints} excluded)`);
      }
      if (originalCounts.pages !== filteredCounts.pages) {
        console.log(`  Pages: ${originalCounts.pages} -> ${filteredCounts.pages} (${originalCounts.pages - filteredCounts.pages} excluded)`);
      }
      console.log('');
    }

    console.log('generating tf import files');
    const actionImports = await generateActionImports(actions.actions, providerAlias);
    const blueprintImports = await generateBlueprintImports(filteredBlueprints, providerAlias);
    const aggregationPropertyImports = await generateAggregationPropertyImports(filteredBlueprints, providerAlias);
    const scorecardImports = await generateScorecardImports(scorecards.scorecards, providerAlias);
    const integrationImports = await generateIntegrationImports(filteredIntegrations, providerAlias);
    const webhookImports = await generateWebhookImports(webhooks.integrations, providerAlias);
    const pageImports = await generatePageImports(filteredPages, providerAlias);
    const folderImports = await generateFolderImports(folders, providerAlias);
    const entityImports = await generateEntityImports(allEntities, providerAlias);

    await Promise.all([
        writeImportBlocksToFile(actionImports, 'action_imports.tf'),
        writeImportBlocksToFile(blueprintImports, 'blueprint_imports.tf'),
        writeImportBlocksToFile(aggregationPropertyImports, 'aggregation_property_imports.tf'),
        writeImportBlocksToFile(scorecardImports, 'scorecard_imports.tf'),
        writeImportBlocksToFile(integrationImports, 'integration_imports.tf'),
        writeImportBlocksToFile(webhookImports, 'webhook_imports.tf'),
        writeImportBlocksToFile(pageImports, 'page_imports.tf'),
        writeImportBlocksToFile(folderImports, 'folder_imports.tf'),
        writeImportBlocksToFile(entityImports, 'entities_imports.tf')
    ]);

    // Display auto-fix summary if fixes were applied
    if (autoFix) {
      displayAutoFixSummary(autoFixes);
    }

    // Display migration warnings if migration mode is enabled
    let warnings: MigrationWarnings | null = null;
    if (migrationMode || generateFixScriptFlag || generateReport || runTerraform) {
      warnings = detectMigrationWarnings(
        integrations.integrations,
        blueprints.blueprints,
        pages.pages,
        actions.actions
      );

      if (migrationMode) {
        displayMigrationWarnings(warnings, autoFix);
      }
    }

    // Generate fix script if requested or if running terraform
    if ((generateFixScriptFlag || runTerraform) && warnings) {
      const fixScriptContent = generateFixScript(warnings);
      await fs.promises.writeFile('fix_generated.sh', fixScriptContent, { mode: 0o755 });
      console.log('Fix script written to fix_generated.sh');
    }

    // Generate migration report if requested
    if (generateReport) {
      if (!warnings) {
        warnings = detectMigrationWarnings(
          integrations.integrations,
          blueprints.blueprints,
          pages.pages,
          actions.actions
        );
      }

      const dependencies = buildDependencyGraph(blueprints.blueprints);

      const resourceCounts = {
        blueprints: filteredBlueprints.length,
        actions: actions.actions.length,
        pages: filteredPages.length,
        integrations: filteredIntegrations.length,
        scorecards: scorecards.scorecards.length,
        webhooks: webhooks.integrations.length,
        folders: folders.sidebar?.items?.filter((i: any) => i.sidebarType === 'folder').length || 0,
        entities: allEntities.length,
      };

      const reportContent = generateMigrationReport(
        warnings,
        autoFixes,
        resourceCounts,
        dependencies,
        PORT_CLIENT_ID,
        PORT_BASE_URL
      );

      await fs.promises.writeFile('migration_report.md', reportContent);
      console.log('Migration report written to migration_report.md');
    }

    // Run terraform if requested
    if (runTerraform) {
      console.log('\n=== Running Terraform ===\n');

      // Check if terraform is installed
      try {
        execSync('terraform version', { stdio: 'pipe' });
      } catch {
        console.error('Error: terraform is not installed or not in PATH');
        process.exit(1);
      }

      // Check if providers.tf exists
      if (!fs.existsSync('providers.tf')) {
        console.log('Creating default providers.tf...');
        const providersContent = `terraform {
  required_providers {
    ${providerAlias} = {
      source  = "port-labs/port-labs"
      version = "~> 2.0"
    }
  }
}

provider "${providerAlias}" {
  client_id   = var.port_client_id
  secret      = var.port_client_secret
}

variable "port_client_id" {
  type = string
}

variable "port_client_secret" {
  type      = string
  sensitive = true
}
`;
        await fs.promises.writeFile('providers.tf', providersContent);
        console.log('Created providers.tf');
      }

      // Run terraform init if .terraform doesn't exist
      if (!fs.existsSync('.terraform')) {
        console.log('Running terraform init...');
        const initResult = spawnSync('terraform', ['init'], {
          stdio: 'inherit',
          env: process.env,
        });
        if (initResult.status !== 0) {
          console.error('terraform init failed');
          process.exit(1);
        }
      }

      // Run terraform plan with generate-config-out
      console.log('\nRunning terraform plan -generate-config-out=generated.tf...');
      console.log('(Errors are expected - the config will still be generated)\n');

      const planEnv = {
        ...process.env,
        TF_VAR_port_client_id: PORT_CLIENT_ID,
        TF_VAR_port_client_secret: PORT_CLIENT_SECRET,
      };

      spawnSync('terraform', ['plan', '-generate-config-out=generated.tf'], {
        stdio: 'inherit',
        env: planEnv,
      });

      // Check if generated.tf was created
      if (!fs.existsSync('generated.tf')) {
        console.error('\nError: generated.tf was not created');
        process.exit(1);
      }

      console.log('\ngenerated.tf created successfully');

      // Run the fix script
      if (fs.existsSync('fix_generated.sh')) {
        console.log('\nApplying fixes from fix_generated.sh...');
        const fixResult = spawnSync('bash', ['fix_generated.sh'], {
          stdio: 'inherit',
        });
        if (fixResult.status !== 0) {
          console.error('fix_generated.sh failed');
          process.exit(1);
        }
      }

      // Run terraform plan again to validate
      console.log('\n=== Validating with terraform plan ===\n');
      const validateResult = spawnSync('terraform', ['plan'], {
        stdio: 'inherit',
        env: planEnv,
      });

      if (validateResult.status === 0) {
        console.log('\n=== Terraform config is valid! ===');
        console.log('\nNext steps:');
        console.log('1. Review migration_report.md for blueprint dependencies');
        console.log('2. Add depends_on to generated.tf for blueprints with relations');
        console.log('3. Switch to target org credentials');
        console.log('4. Run: rm *_imports.tf && terraform apply');
      } else {
        console.log('\n=== Terraform validation had issues ===');
        console.log('Review the errors above and fix generated.tf manually');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
