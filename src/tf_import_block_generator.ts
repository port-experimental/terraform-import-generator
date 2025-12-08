interface PortAction {
    identifier: string;
    title: string;
}

interface PortBlueprint {
    identifier: string;
    title: string;
    aggregationProperties: PortAggregationProperty[];
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
}

interface PortWebhook {
    identifier: string;
    title: string;
}

interface PortPage {
    identifier: string;
    type: string;
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
    
    scorecards.forEach((scorecard: PortScorecard) => {
        // Skip system blueprints - they are imported in generateBlueprintImports
        if (!isSystemBlueprint(scorecard.blueprint)) {
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
        // Skip pages for system blueprints, or system features, or entity pages (not supported)
        if (!page.identifier.startsWith('$') && !page.identifier.startsWith('_') && page.type !== 'entity') {
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
            // Skip system blueprints - they are imported in generateBlueprintImports
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
