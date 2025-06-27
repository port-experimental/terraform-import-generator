import { getClient } from './src/port_client';
import { 
  generateActionImports, 
  generateBlueprintImports, 
  generateScorecardImports,
  generateIntegrationImports,
  generateWebhookImports,
  generatePageImports,
  generateFolderImports,
  generateEntityImports,
  writeImportBlocksToFile 
} from './src/tf_import_block_generator';

async function main() {
  const PORT_CLIENT_ID = process.env.PORT_CLIENT_ID;
  const PORT_CLIENT_SECRET = process.env.PORT_CLIENT_SECRET;

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
    // to import entities add desired blueprint identifiers, e.g. replace [] with ['service', 'environments']
    const blueprintIdentifiers = [];

    let allEntities: any[] = [];

    if (blueprintIdentifiers.length > 0) {
      for (const blueprintId of blueprintIdentifiers) {
        console.log(`fetching entities for blueprint: ${blueprintId}`);
        const res = await client.get(`/blueprints/${blueprintId}/entities`);
        allEntities = allEntities.concat(res.entities);
      }
    } else {
      console.log('No blueprint identifiers provided, skipping entity fetch.');
    }

    console.log('generating tf import files');
    const actionImports = await generateActionImports(actions.actions);
    const blueprintImports = await generateBlueprintImports(blueprints.blueprints);
    const scorecardImports = await generateScorecardImports(scorecards.scorecards);
    const integrationImports = await generateIntegrationImports(integrations.integrations);
    const webhookImports = await generateWebhookImports(webhooks.integrations);
    const pageImports = await generatePageImports(pages.pages);
    const folderImports = await generateFolderImports(folders);    
    const entityImports = await generateEntityImports(allEntities);

    await Promise.all([
        writeImportBlocksToFile(actionImports, 'action_imports.tf'),
        writeImportBlocksToFile(blueprintImports, 'blueprint_imports.tf'),
        writeImportBlocksToFile(scorecardImports, 'scorecard_imports.tf'),
        writeImportBlocksToFile(integrationImports, 'integration_imports.tf'),
        writeImportBlocksToFile(webhookImports, 'webhook_imports.tf'),
        writeImportBlocksToFile(pageImports, 'page_imports.tf'),
        writeImportBlocksToFile(folderImports, 'folder_imports.tf'),      
        writeImportBlocksToFile(entityImports, "entities_imports.tf")
    ]);

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
