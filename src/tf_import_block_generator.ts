// Migration warning types
export interface MigrationWarning {
    category: 'github-integration' | 'system-blueprint' | 'ai-agent-page' |
              'page-ordering' | 'relation-title' | 'automation-trigger' | 'entity-page-type';
    resourceType: string;
    resourceId: string;
    message: string;
}

export interface MigrationWarnings {
    githubIntegrations: MigrationWarning[];
    systemBlueprints: MigrationWarning[];
    aiAgentPages: MigrationWarning[];
    pageOrdering: MigrationWarning[];
    relationTitles: MigrationWarning[];
    automationTriggers: MigrationWarning[];
    entityPageTypes: MigrationWarning[];
}

// Auto-fix types
export interface AutoFixResult {
    entityPageTypesFixed: string[];
    relationTitlesFixed: { blueprint: string; relation: string; newTitle: string }[];
    pageOrderingFixed: string[];
}

// Filter options for generation
export interface FilterOptions {
    excludeGithubIntegrations?: boolean;
    excludeSystemBlueprints?: boolean;
    excludeAiPages?: boolean;
    excludePatterns?: string[];
}

// Blueprint dependency for depends_on generation
export interface BlueprintDependency {
    blueprint: string;
    dependsOn: string[];
}

// Helper function to humanize a relation key (e.g., "service_owner" -> "Service Owner")
export function humanizeRelationKey(key: string): string {
    return key
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

interface PortAction {
    identifier: string;
    title: string;
    automation_trigger?: any;
}

interface PortBlueprintRelation {
    target: string;
    many?: boolean;
    required?: boolean;
    title?: string | null;
}

interface PortBlueprint {
    identifier: string;
    title: string;
    aggregationProperties: PortAggregationProperty[];
    relations?: Record<string, PortBlueprintRelation>;
}

interface PortAggregationProperty {
    identifier: string;
    title: string;
}

interface PortScorecard {
    identifier: string;
    title: string;
    blueprint: string;
}

interface PortIntegration {
    identifier: string;
    title: string;
    integrationType: string;
    installationId?: string;
}

interface PortWebhook {
    identifier: string;
    title: string;
}

interface PortPage {
    identifier: string;
    type: string;
    after?: string | null;
    widgets?: string[];
}

interface PortSidebarResponse {
    sidebar: PortSidebar;
}

interface PortSidebar {
    items: PortSidebarItem[];
}

interface PortSidebarItem {
    identifier: string;
    sidebarType: string;
}

interface PortEntities {
    identifier: string;
    title: string;
    blueprint: string;
}

const cleanIdentifier = (identifier: string) => identifier.replace(/^\./g, 'dot');

// Helper function to check if a blueprint is a system blueprint
const isSystemBlueprint = (identifier: string): boolean => {
    return identifier.startsWith('_');
};

export async function generateActionImports(actions: PortAction[], providerAlias: string = 'port-labs'): Promise<string[]> {
    const importBlocks: string[] = [];
    
    actions.forEach((action: PortAction) => {
        importBlocks.push(
            `import {
  to = port_action.${action.identifier}
  id = "${action.identifier}"
  provider = ${providerAlias}
}`
        );
    });
    
    return importBlocks;
}


export async function generateScorecardImports(scorecards: PortScorecard[], providerAlias: string = 'port-labs'): Promise<string[]> {
    const importBlocks: string[] = [];
    const systemBlueprintsImported = new Set<string>();
    
    scorecards.forEach((scorecard: PortScorecard) => {
        // Check if the scorecard belongs to a system blueprint
        if (isSystemBlueprint(scorecard.blueprint)) {
            if (!systemBlueprintsImported.has(scorecard.blueprint)) {
                systemBlueprintsImported.add(scorecard.blueprint);
                importBlocks.push(
                    `import {
  to = port_system_blueprint.${scorecard.blueprint}
  id = "${scorecard.blueprint}"
  provider = ${providerAlias}
}`
                );
            }
        } else {
            importBlocks.push(
                `import {
  to = port_scorecard.${scorecard.identifier}
  id = "${scorecard.blueprint}:${scorecard.identifier}"
  provider = ${providerAlias}
}`
            );
        }
    });
    
    return importBlocks;
}
const ensureValidResourceName = (id: string, integrationType: string) => {
    const trimmedId = id.trim();
    return !isNaN(Number(trimmedId)) || !/[a-zA-Z]/.test(trimmedId) || /^\{/.test(trimmedId) ? `${integrationType}-${trimmedId.replace(/[{}]/g, '')}` : trimmedId;
};

export async function generateIntegrationImports(integrations: PortIntegration[], providerAlias: string = 'port-labs'): Promise<string[]> {
    const importBlocks: string[] = [];
    
    integrations.forEach((integration: PortIntegration) => {
        importBlocks.push(
            `import {
  to = port_integration.${ensureValidResourceName(integration.identifier, integration.integrationType)}
  id = "${integration.identifier}"
  provider = ${providerAlias}
}`
        );
    });
    
    return importBlocks;
}

export async function generateWebhookImports(webhooks: PortWebhook[], providerAlias: string = 'port-labs'): Promise<string[]> {
    const importBlocks: string[] = [];
    
    webhooks.forEach((webhook: PortWebhook) => {
        importBlocks.push(
            `import {
  to = port_webhook.${webhook.identifier}
  id = "${webhook.identifier}"
  provider = ${providerAlias}
}`
        );
    });
    
    return importBlocks;
}

export async function generatePageImports(pages: PortPage[], providerAlias: string = 'port-labs'): Promise<string[]> {
    const importBlocks: string[] = [];
    pages.forEach((page: PortPage) => {
        // Skip pages for system blueprints or system features
        if (!page.identifier.startsWith('$') && !page.identifier.startsWith('_')) {
            importBlocks.push(
                `import {
        to = port_page.${page.identifier}
        id = "${page.identifier}"
        provider = ${providerAlias}
    }`
            );
        }
    });
    return importBlocks;
}

export async function generateBlueprintImports(blueprints: PortBlueprint[], providerAlias: string = 'port-labs'): Promise<string[]> {
    const importBlocks: string[] = [];
    
    blueprints.forEach((blueprint: PortBlueprint) => {
        if (isSystemBlueprint(blueprint.identifier)) {
            importBlocks.push(
                `import {
  to = port_system_blueprint.${blueprint.identifier}
  id = "${blueprint.identifier}"
  provider = ${providerAlias}
}`
            );
        } else {
            importBlocks.push(
                `import {
  to = port_blueprint.${blueprint.identifier}
  id = "${blueprint.identifier}"
  provider = ${providerAlias}
}`
            );
        }
    });
    
    return importBlocks;
}

export async function generateAggregationPropertyImports(blueprints: PortBlueprint[], providerAlias: string = 'port-labs'): Promise<string[]> {
    const importBlocks: string[] = [];
    blueprints.forEach((blueprint: PortBlueprint) => {
        if (Object.entries(blueprint.aggregationProperties).length > 0) {
            // Skip system blueprints here to avoid duplicate imports; they are handled in blueprint imports
            if (!isSystemBlueprint(blueprint.identifier)) {
                importBlocks.push(
                    `import {
                    to = port_aggregation_properties.${blueprint.identifier}_aggregation_properties
                    id = "${blueprint.identifier}"
                    provider = ${providerAlias}
                }`
                );
            }
        }
    });

    return importBlocks;
}

export async function generateFolderImports(sidebarResponse: PortSidebarResponse, providerAlias: string = 'port-labs'): Promise<string[]> {
    const importBlocks: string[] = [];

    sidebarResponse.sidebar.items.forEach((item: PortSidebarItem) => {
        // skip pages and filter out folder identifiers that start with digit (invalid HCL syntax)
        if (
            item.sidebarType === "folder" &&
            !/^\d/.test(item.identifier)
        ) {
            importBlocks.push(
                `import {
    to = port_folder.${item.identifier}
    id = "${item.identifier}"
    provider = ${providerAlias}
}`
            );
        }
    });

    return importBlocks;
}

export async function generateEntityImports(entities: PortEntities[], providerAlias: string = 'port-labs'): Promise<string[]> {
    const importBlocks: string[] = [];
    const systemBlueprintsImported = new Set<string>();
    // console.log(`Generating entity imports for ${entities} entities`);
    entities.forEach((entity: PortEntities) => {
        if (isSystemBlueprint(entity.blueprint)) {
            if (!systemBlueprintsImported.has(entity.blueprint)) {
                systemBlueprintsImported.add(entity.blueprint);
                importBlocks.push(
                    `import {
                    to = port_system_blueprint.${entity.blueprint}
                    id = "${entity.blueprint}"
                    provider = ${providerAlias}
                    }`
                );
            }
        } else {
            importBlocks.push(
                `import {
                to = port_entity.${cleanIdentifier(entity.identifier)}
                id = "${entity.blueprint}:${entity.identifier}"
                provider = ${providerAlias}
                }`
            );
        }
    });

    return importBlocks;
}

export async function writeImportBlocksToFile(
    importBlocks: string[],
    outputPath: string
): Promise<void> {
    const fs = require('fs');
    const content = importBlocks.join('\n\n');

    try {
        await fs.promises.writeFile(outputPath, content);
        console.log(`Import blocks written to ${outputPath}`);
    } catch (error) {
        console.error('Error writing import blocks:', error);
        throw error;
    }
}

// Helper to check if a page has AI agent widgets
function hasAiAgentWidget(page: PortPage): boolean {
    if (!page.widgets || !Array.isArray(page.widgets)) {
        return false;
    }
    for (const widgetJson of page.widgets) {
        try {
            const widget = typeof widgetJson === 'string' ? JSON.parse(widgetJson) : widgetJson;
            if (widget.type === 'ai-agent' || widget.agentIdentifier) {
                return true;
            }
        } catch {
            // If we can't parse, check as string
            if (typeof widgetJson === 'string' &&
                (widgetJson.includes('"type":"ai-agent"') || widgetJson.includes('agentIdentifier'))) {
                return true;
            }
        }
    }
    return false;
}

export function detectMigrationWarnings(
    integrations: PortIntegration[],
    blueprints: PortBlueprint[],
    pages: PortPage[],
    actions: PortAction[]
): MigrationWarnings {
    const warnings: MigrationWarnings = {
        githubIntegrations: [],
        systemBlueprints: [],
        aiAgentPages: [],
        pageOrdering: [],
        relationTitles: [],
        automationTriggers: [],
        entityPageTypes: [],
    };

    // Build set of imported page identifiers (pages that will be managed by terraform)
    const importedPageIds = new Set<string>();
    pages.forEach(page => {
        if (!page.identifier.startsWith('$') && !page.identifier.startsWith('_')) {
            importedPageIds.add(page.identifier);
        }
    });

    // Detect GitHub integrations
    integrations.forEach(integration => {
        if (integration.integrationType.toLowerCase() === 'github') {
            warnings.githubIntegrations.push({
                category: 'github-integration',
                resourceType: 'integration',
                resourceId: integration.identifier,
                message: `GitHub integration "${integration.identifier}" uses installation ID specific to source org`,
            });
        }
    });

    // Detect system blueprints
    blueprints.forEach(blueprint => {
        if (isSystemBlueprint(blueprint.identifier)) {
            warnings.systemBlueprints.push({
                category: 'system-blueprint',
                resourceType: 'blueprint',
                resourceId: blueprint.identifier,
                message: `System blueprint "${blueprint.identifier}" cannot be created via Terraform`,
            });
        }
    });

    // Detect AI agent pages and entity page types
    pages.forEach(page => {
        if (!page.identifier.startsWith('$') && !page.identifier.startsWith('_')) {
            // Detect pages with type "entity" that need to be changed to "blueprint-entities"
            if (page.type === 'entity') {
                warnings.entityPageTypes.push({
                    category: 'entity-page-type',
                    resourceType: 'page',
                    resourceId: page.identifier,
                    message: `Page "${page.identifier}" has type "entity" (change to "blueprint-entities")`,
                });
            }

            if (hasAiAgentWidget(page)) {
                warnings.aiAgentPages.push({
                    category: 'ai-agent-page',
                    resourceType: 'page',
                    resourceId: page.identifier,
                    message: `Page "${page.identifier}" contains AI agent widget`,
                });
            }
        }
    });

    // Detect page ordering issues (after references non-imported page)
    pages.forEach(page => {
        if (!page.identifier.startsWith('$') && !page.identifier.startsWith('_')) {
            if (page.after && !importedPageIds.has(page.after)) {
                warnings.pageOrdering.push({
                    category: 'page-ordering',
                    resourceType: 'page',
                    resourceId: page.identifier,
                    message: `Page "${page.identifier}" references "${page.after}" (not imported)`,
                });
            }
        }
    });

    // Detect null relation titles
    blueprints.forEach(blueprint => {
        if (blueprint.relations) {
            Object.entries(blueprint.relations).forEach(([relationName, relation]) => {
                if (relation.title === null) {
                    warnings.relationTitles.push({
                        category: 'relation-title',
                        resourceType: 'blueprint',
                        resourceId: `${blueprint.identifier}.${relationName}`,
                        message: `Relation "${blueprint.identifier}.${relationName}" has null title`,
                    });
                }
            });
        }
    });

    // Detect automation triggers
    actions.forEach(action => {
        if (action.automation_trigger !== undefined && action.automation_trigger !== null) {
            warnings.automationTriggers.push({
                category: 'automation-trigger',
                resourceType: 'action',
                resourceId: action.identifier,
                message: `Action "${action.identifier}" has automation trigger`,
            });
        }
    });

    return warnings;
}

// Apply auto-fixes to pages (entity type and page ordering)
export function applyPageAutoFixes(
    pages: PortPage[],
    importedPageIds: Set<string>
): { pages: PortPage[]; fixes: AutoFixResult } {
    const fixes: AutoFixResult = {
        entityPageTypesFixed: [],
        relationTitlesFixed: [],
        pageOrderingFixed: [],
    };

    const fixedPages = pages.map(page => {
        const fixedPage = { ...page };

        // Skip system pages
        if (page.identifier.startsWith('$') || page.identifier.startsWith('_')) {
            return fixedPage;
        }

        // Fix entity page type -> blueprint-entities
        if (page.type === 'entity') {
            fixedPage.type = 'blueprint-entities';
            fixes.entityPageTypesFixed.push(page.identifier);
        }

        // Fix page ordering issues
        if (page.after && !importedPageIds.has(page.after)) {
            fixedPage.after = null;
            fixes.pageOrderingFixed.push(page.identifier);
        }

        return fixedPage;
    });

    return { pages: fixedPages, fixes };
}

// Apply auto-fixes to blueprint relation titles
export function applyBlueprintAutoFixes(
    blueprints: PortBlueprint[]
): { blueprints: PortBlueprint[]; fixes: AutoFixResult } {
    const fixes: AutoFixResult = {
        entityPageTypesFixed: [],
        relationTitlesFixed: [],
        pageOrderingFixed: [],
    };

    const fixedBlueprints = blueprints.map(blueprint => {
        if (!blueprint.relations) {
            return blueprint;
        }

        const fixedRelations: Record<string, PortBlueprintRelation> = {};
        let hasChanges = false;

        Object.entries(blueprint.relations).forEach(([relationName, relation]) => {
            if (relation.title === null) {
                const newTitle = humanizeRelationKey(relationName);
                fixedRelations[relationName] = { ...relation, title: newTitle };
                fixes.relationTitlesFixed.push({
                    blueprint: blueprint.identifier,
                    relation: relationName,
                    newTitle,
                });
                hasChanges = true;
            } else {
                fixedRelations[relationName] = relation;
            }
        });

        if (hasChanges) {
            return { ...blueprint, relations: fixedRelations };
        }
        return blueprint;
    });

    return { blueprints: fixedBlueprints, fixes };
}

// Build dependency graph for blueprints based on their relations
export function buildDependencyGraph(blueprints: PortBlueprint[]): BlueprintDependency[] {
    const dependencies: BlueprintDependency[] = [];
    const blueprintIds = new Set(blueprints.map(b => b.identifier));

    blueprints.forEach(blueprint => {
        // Skip system blueprints
        if (isSystemBlueprint(blueprint.identifier)) {
            return;
        }

        if (blueprint.relations && Object.keys(blueprint.relations).length > 0) {
            const dependsOn: string[] = [];

            Object.values(blueprint.relations).forEach(relation => {
                // Only add dependency if target blueprint exists and is not a system blueprint
                if (blueprintIds.has(relation.target) && !isSystemBlueprint(relation.target)) {
                    if (!dependsOn.includes(relation.target) && relation.target !== blueprint.identifier) {
                        dependsOn.push(relation.target);
                    }
                }
            });

            if (dependsOn.length > 0) {
                dependencies.push({
                    blueprint: blueprint.identifier,
                    dependsOn,
                });
            }
        }
    });

    return dependencies;
}

// Filter integrations based on filter options
export function filterIntegrations(
    integrations: PortIntegration[],
    options: FilterOptions
): PortIntegration[] {
    return integrations.filter(integration => {
        // Exclude GitHub integrations
        if (options.excludeGithubIntegrations && integration.integrationType.toLowerCase() === 'github') {
            return false;
        }

        // Check exclude patterns
        if (options.excludePatterns) {
            for (const pattern of options.excludePatterns) {
                if (matchesExcludePattern(pattern, 'integration', integration.identifier, integration.integrationType)) {
                    return false;
                }
            }
        }

        return true;
    });
}

// Filter blueprints based on filter options
export function filterBlueprints(
    blueprints: PortBlueprint[],
    options: FilterOptions
): PortBlueprint[] {
    return blueprints.filter(blueprint => {
        // Exclude system blueprints (only if flag is set - they are still imported by default for reference)
        if (options.excludeSystemBlueprints && isSystemBlueprint(blueprint.identifier)) {
            return false;
        }

        // Check exclude patterns
        if (options.excludePatterns) {
            for (const pattern of options.excludePatterns) {
                if (matchesExcludePattern(pattern, 'blueprint', blueprint.identifier)) {
                    return false;
                }
            }
        }

        return true;
    });
}

// Filter pages based on filter options
export function filterPages(
    pages: PortPage[],
    options: FilterOptions
): PortPage[] {
    return pages.filter(page => {
        // Skip system pages
        if (page.identifier.startsWith('$') || page.identifier.startsWith('_')) {
            return true; // Let the normal import logic handle these
        }

        // Exclude AI agent pages
        if (options.excludeAiPages && hasAiAgentWidget(page)) {
            return false;
        }

        // Check exclude patterns
        if (options.excludePatterns) {
            for (const pattern of options.excludePatterns) {
                if (matchesExcludePattern(pattern, 'page', page.identifier)) {
                    return false;
                }
            }
        }

        return true;
    });
}

// Helper to match exclude patterns like "integration:GitHub-*" or "page:_*"
function matchesExcludePattern(
    pattern: string,
    resourceType: string,
    identifier: string,
    subType?: string
): boolean {
    const parts = pattern.split(':');
    if (parts.length !== 2) {
        return false;
    }

    const [patternType, patternValue] = parts;

    // Check if pattern type matches
    if (patternType.toLowerCase() !== resourceType.toLowerCase()) {
        return false;
    }

    // Convert glob pattern to regex
    const regexPattern = patternValue
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars except *
        .replace(/\*/g, '.*'); // Convert * to .*

    const regex = new RegExp(`^${regexPattern}$`, 'i');

    // Check identifier
    if (regex.test(identifier)) {
        return true;
    }

    // For integrations, also check subType (integrationType)
    if (subType && regex.test(subType)) {
        return true;
    }

    return false;
}

// Generate fix script content for issues that can't be auto-fixed during import
export function generateFixScript(warnings: MigrationWarnings): string {
    const lines: string[] = [
        '#!/bin/bash',
        '# Auto-generated fix script for generated.tf',
        '# Run this after: terraform plan -generate-config-out=generated.tf',
        '',
        'set -e',
        '',
    ];

    let hasFixableIssues = false;

    // Entity page type fixes - ALWAYS include since Terraform fetches from API
    if (warnings.entityPageTypes.length > 0) {
        hasFixableIssues = true;
        lines.push(`# Fix ${warnings.entityPageTypes.length} entity page types (change "entity" to "blueprint-entities")`);
        lines.push('if [[ "$OSTYPE" == "darwin"* ]]; then');
        lines.push('  sed -i \'\' \'s/type *= *"entity"/type = "blueprint-entities"/g\' generated.tf');
        lines.push('else');
        lines.push('  sed -i \'s/type *= *"entity"/type = "blueprint-entities"/g\' generated.tf');
        lines.push('fi');
        lines.push('echo "Fixed entity page types"');
        lines.push('');
    }

    // Always fix jq_condition expressions = null (provider requires expressions to be set)
    // This is a common issue with automation triggers
    hasFixableIssues = true;
    lines.push('# Fix jq_condition expressions (change null to empty array)');
    lines.push('if [[ "$OSTYPE" == "darwin"* ]]; then');
    lines.push('  sed -i \'\' \'s/expressions = null/expressions = []/g\' generated.tf');
    lines.push('else');
    lines.push('  sed -i \'s/expressions = null/expressions = []/g\' generated.tf');
    lines.push('fi');
    lines.push('echo "Fixed jq_condition expressions"');
    lines.push('');

    // Relation title fixes - these need manual review but we provide guidance
    if (warnings.relationTitles.length > 0) {
        lines.push(`# Fix ${warnings.relationTitles.length} null relation titles`);
        lines.push('# Note: Applying automatic fix - defaulting titles from relation key names');
        warnings.relationTitles.forEach(w => {
            const parts = w.resourceId.split('.');
            if (parts.length === 2) {
                const relationName = parts[1];
                const humanizedTitle = humanizeRelationKey(relationName);
                // Create sed command to replace title = null with title = "Humanized Title"
                // This is a best-effort fix - complex cases may need manual review
                lines.push(`# ${w.resourceId} -> "${humanizedTitle}"`);
            }
        });
        lines.push('# To fix automatically, review and run:');
        lines.push('# sed -i \'\' \'s/title *= *null/title = "REVIEW_ME"/g\' generated.tf');
        lines.push('');
    }

    // Page ordering fixes
    if (warnings.pageOrdering.length > 0) {
        lines.push(`# Fix ${warnings.pageOrdering.length} page ordering issues`);
        lines.push('# Pages referencing non-imported pages - setting after = null');
        warnings.pageOrdering.forEach(w => {
            lines.push(`# ${w.resourceId}`);
        });
        lines.push('# Note: You may need to manually set after = null for these pages in generated.tf');
        lines.push('');
    }

    if (hasFixableIssues) {
        lines.push('echo "Fixes applied to generated.tf"');
    } else {
        lines.push('echo "No automatic fixes needed"');
    }

    return lines.join('\n');
}

// Generate migration report content
export function generateMigrationReport(
    warnings: MigrationWarnings,
    autoFixes: AutoFixResult,
    resourceCounts: {
        blueprints: number;
        actions: number;
        pages: number;
        integrations: number;
        scorecards: number;
        webhooks: number;
        folders: number;
        entities: number;
    },
    dependencies: BlueprintDependency[],
    clientId?: string,
    apiUrl?: string
): string {
    const date = new Date().toISOString().split('T')[0];
    const maskedClientId = clientId ? `${clientId.substring(0, 4)}...(masked)` : 'N/A';

    const lines: string[] = [
        `# Migration Report - ${date}`,
        '',
        '## Source Organization',
        `- Client ID: ${maskedClientId}`,
        `- API URL: ${apiUrl || 'api.getport.io'}`,
        '',
        '## Resources Exported',
        '| Resource Type | Count | Issues |',
        '|--------------|-------|--------|',
    ];

    // Calculate issues per resource type
    const blueprintIssues = warnings.systemBlueprints.length;
    const actionIssues = warnings.automationTriggers.length;
    const pageIssues = warnings.aiAgentPages.length + warnings.pageOrdering.length + warnings.entityPageTypes.length;
    const integrationIssues = warnings.githubIntegrations.length;

    lines.push(`| Blueprints | ${resourceCounts.blueprints} | ${blueprintIssues > 0 ? `${blueprintIssues} system` : '0'} |`);
    lines.push(`| Actions | ${resourceCounts.actions} | ${actionIssues > 0 ? `${actionIssues} automation trigger` : '0'} |`);
    lines.push(`| Pages | ${resourceCounts.pages} | ${pageIssues > 0 ? `${warnings.aiAgentPages.length} AI agents, ${warnings.pageOrdering.length} ordering, ${warnings.entityPageTypes.length} entity type` : '0'} |`);
    lines.push(`| Integrations | ${resourceCounts.integrations} | ${integrationIssues > 0 ? `${integrationIssues} GitHub` : '0'} |`);
    lines.push(`| Scorecards | ${resourceCounts.scorecards} | 0 |`);
    lines.push(`| Webhooks | ${resourceCounts.webhooks} | 0 |`);
    lines.push(`| Folders | ${resourceCounts.folders} | 0 |`);
    if (resourceCounts.entities > 0) {
        lines.push(`| Entities | ${resourceCounts.entities} | 0 |`);
    }

    lines.push('');
    lines.push('## Warnings Summary');

    const warningItems: string[] = [];
    if (warnings.systemBlueprints.length > 0) {
        warningItems.push(`- ${warnings.systemBlueprints.length} system blueprints (cannot migrate via Terraform)`);
    }
    if (warnings.githubIntegrations.length > 0) {
        warningItems.push(`- ${warnings.githubIntegrations.length} GitHub integrations (require reconfiguration)`);
    }
    if (warnings.aiAgentPages.length > 0) {
        warningItems.push(`- ${warnings.aiAgentPages.length} AI agent pages (require manual setup)`);
    }
    if (warnings.relationTitles.length > 0) {
        const fixedNote = autoFixes.relationTitlesFixed.length > 0 ? ' (auto-fixed)' : '';
        warningItems.push(`- ${warnings.relationTitles.length} null relation titles${fixedNote}`);
    }
    if (warnings.pageOrdering.length > 0) {
        const fixedNote = autoFixes.pageOrderingFixed.length > 0 ? ' (auto-fixed)' : '';
        warningItems.push(`- ${warnings.pageOrdering.length} page ordering issues${fixedNote}`);
    }
    if (warnings.entityPageTypes.length > 0) {
        const fixedNote = autoFixes.entityPageTypesFixed.length > 0 ? ' (auto-fixed)' : '';
        warningItems.push(`- ${warnings.entityPageTypes.length} entity page types${fixedNote}`);
    }
    if (warnings.automationTriggers.length > 0) {
        warningItems.push(`- ${warnings.automationTriggers.length} automation triggers (may need userInputs configuration)`);
    }

    if (warningItems.length === 0) {
        lines.push('No warnings detected.');
    } else {
        lines.push(...warningItems);
    }

    // Auto-fixes applied section
    if (autoFixes.entityPageTypesFixed.length > 0 ||
        autoFixes.relationTitlesFixed.length > 0 ||
        autoFixes.pageOrderingFixed.length > 0) {
        lines.push('');
        lines.push('## Auto-Fixes Applied');

        if (autoFixes.entityPageTypesFixed.length > 0) {
            lines.push(`- Entity page types fixed: ${autoFixes.entityPageTypesFixed.join(', ')}`);
        }
        if (autoFixes.pageOrderingFixed.length > 0) {
            lines.push(`- Page ordering fixed: ${autoFixes.pageOrderingFixed.join(', ')}`);
        }
        if (autoFixes.relationTitlesFixed.length > 0) {
            lines.push('- Relation titles fixed:');
            autoFixes.relationTitlesFixed.forEach(fix => {
                lines.push(`  - ${fix.blueprint}.${fix.relation} → "${fix.newTitle}"`);
            });
        }
    }

    lines.push('');
    lines.push('## Manual Steps Required');
    lines.push('1. Run: `terraform plan -generate-config-out=generated.tf`');
    lines.push('2. Run: `./fix_generated.sh` (if generated)');
    lines.push('3. Add `depends_on` for blueprint relations (see below)');
    lines.push('4. Switch credentials to target org');
    lines.push('5. Run: `terraform apply`');

    // Blueprint dependencies section
    if (dependencies.length > 0) {
        lines.push('');
        lines.push('## Blueprint Dependencies');
        lines.push('The following blueprints have relations and need `depends_on`:');
        lines.push('```hcl');
        dependencies.forEach(dep => {
            const depsList = dep.dependsOn.map(d => `port_blueprint.${d}`).join(', ');
            lines.push(`# port_blueprint.${dep.blueprint}: depends_on = [${depsList}]`);
        });
        lines.push('```');
    }

    lines.push('');
    lines.push('---');
    lines.push('*Generated by port-tf-import*');

    return lines.join('\n');
}
