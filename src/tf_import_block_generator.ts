import { AxiosResponse } from 'axios';

interface PortAction {
    identifier: string;
    title: string;
}

interface PortBlueprint {
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
}

interface PortFolder {
    identifier: string;
    title: string;
}

export async function generateActionImports(actions: PortAction[]): Promise<string[]> {
    const importBlocks: string[] = [];
    
    actions.forEach((action: PortAction) => {
        importBlocks.push(
            `import {
  to = port_action.${action.identifier}
  id = "${action.identifier}" 
}`
        );
    });
    
    return importBlocks;
}


export async function generateScorecardImports(scorecards: PortScorecard[]): Promise<string[]> {
    const importBlocks: string[] = [];
    
    scorecards.forEach((scorecard: PortScorecard) => {
        importBlocks.push(
            `import {
  to = port_scorecard.${scorecard.identifier}
  id = "${scorecard.blueprint}:${scorecard.identifier}" 
}`
        );
    });
    
    return importBlocks;
}
const ensureValidResourceName = (id: string, integrationType: string) => !isNaN(Number(id)) || !/[a-zA-Z]/.test(id) || /^\{/.test(id) ? `${integrationType}-${id.replace(/[{}]/g, '')}` : id;

export async function generateIntegrationImports(integrations: PortIntegration[]): Promise<string[]> {
    const importBlocks: string[] = [];
    
    integrations.forEach((integration: PortIntegration) => {
        importBlocks.push(
            `import {
  to = port_integration.${ensureValidResourceName(integration.identifier, integration.integrationType)}
  id = "${integration.identifier}" 
}`
        );
    });
    
    return importBlocks;
}

export async function generateWebhookImports(webhooks: PortWebhook[]): Promise<string[]> {
    const importBlocks: string[] = [];
    
    webhooks.forEach((webhook: PortWebhook) => {
        importBlocks.push(
            `import {
  to = port_webhook.${webhook.identifier}
  id = "${webhook.identifier}" 
}`
        );
    });
    
    return importBlocks;
}

export async function generatePageImports(pages: PortPage[]): Promise<string[]> {
    const importBlocks: string[] = [];
    pages.forEach((page: PortPage) => {
        // Skip pages for system blueprints, or system features
        if (!page.identifier.startsWith('$') && !page.identifier.startsWith('_')) {
            importBlocks.push(
                `import {
        to = port_page.${page.identifier}
        id = "${page.identifier}" 
    }`
            );
        }
    });
    return importBlocks;
}

export async function generateBlueprintImports(blueprints: PortBlueprint[]): Promise<string[]> {
    const importBlocks: string[] = [];
    
    blueprints.forEach((blueprint: PortBlueprint) => {
        importBlocks.push(
            `import {
  to = port_blueprint.${blueprint.identifier}
  id = "${blueprint.identifier}"
}`
        );
    });
    
    return importBlocks;
}

export async function generateFolderImports(sidebarResponse: PortSidebar): Promise<string[]> {
    const importBlocks: string[] = [];

    sidebarResponse.sidebar.items.forEach((item) => {
        // skip pages and filter out folder identifiers that start with digit (invalid HCL syntax)
        if (
            item.sidebarType === "folder" &&
            !/^\d/.test(item.identifier)
        ) {
            importBlocks.push(
                `import {
    to = port_folder.${item.identifier}
    id = "${item.identifier}" 
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
