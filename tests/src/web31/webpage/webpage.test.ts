import { assert, test } from "vitest";

import { runScenario, dhtSync, CallableCell } from '@holochain/tryorama';
import { NewEntryAction, ActionHash, Record, AppBundleSource, fakeDnaHash, fakeActionHash, fakeAgentPubKey, fakeEntryHash } from '@holochain/client';
import { decode } from '@msgpack/msgpack';

import { createWebpage, sampleWebpage } from './common.js';

test('create Webpage', async () => {
  await runScenario(async scenario => {
    // Construct proper paths for your app.
    // This assumes app bundle created by the `hc app pack` command.
    const testAppPath = process.cwd() + '/../workdir/web31.happ';

    // Set up the app to be installed 
    const appSource = { appBundleSource: { path: testAppPath } };

    // Add 2 players with the test app to the Scenario. The returned players
    // can be destructured.
    const [alice, bob] = await scenario.addPlayersWithApps([appSource, appSource]);

    // Shortcut peer discovery through gossip and register all agents in every
    // conductor of the scenario.
    await scenario.shareAllAgents();

    // Alice creates a Webpage
    const record: Record = await createWebpage(alice.cells[0]);
    assert.ok(record);
  });
});

test('create and read Webpage', async () => {
  await runScenario(async scenario => {
    // Construct proper paths for your app.
    // This assumes app bundle created by the `hc app pack` command.
    const testAppPath = process.cwd() + '/../workdir/web31.happ';

    // Set up the app to be installed 
    const appSource = { appBundleSource: { path: testAppPath } };

    // Add 2 players with the test app to the Scenario. The returned players
    // can be destructured.
    const [alice, bob] = await scenario.addPlayersWithApps([appSource, appSource]);

    // Shortcut peer discovery through gossip and register all agents in every
    // conductor of the scenario.
    await scenario.shareAllAgents();

    const sample = await sampleWebpage(alice.cells[0]);

    // Alice creates a Webpage
    const record: Record = await createWebpage(alice.cells[0], sample);
    assert.ok(record);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

    // Bob gets the created Webpage
    const createReadOutput: Record = await bob.cells[0].callZome({
      zome_name: "webpage",
      fn_name: "get_original_webpage",
      payload: record.signed_action.hashed.hash,
    });
    assert.deepEqual(sample, decode((createReadOutput.entry as any).Present.entry) as any);

  });
});

test('create and update Webpage', async () => {
  await runScenario(async scenario => {
    // Construct proper paths for your app.
    // This assumes app bundle created by the `hc app pack` command.
    const testAppPath = process.cwd() + '/../workdir/web31.happ';

    // Set up the app to be installed 
    const appSource = { appBundleSource: { path: testAppPath } };

    // Add 2 players with the test app to the Scenario. The returned players
    // can be destructured.
    const [alice, bob] = await scenario.addPlayersWithApps([appSource, appSource]);

    // Shortcut peer discovery through gossip and register all agents in every
    // conductor of the scenario.
    await scenario.shareAllAgents();

    // Alice creates a Webpage
    const record: Record = await createWebpage(alice.cells[0]);
    assert.ok(record);
        
    const originalActionHash = record.signed_action.hashed.hash;
 
    // Alice updates the Webpage
    let contentUpdate: any = await sampleWebpage(alice.cells[0]);
    let updateInput = {
      original_webpage_hash: originalActionHash,
      previous_webpage_hash: originalActionHash,
      updated_webpage: contentUpdate,
    };

    let updatedRecord: Record = await alice.cells[0].callZome({
      zome_name: "webpage",
      fn_name: "update_webpage",
      payload: updateInput,
    });
    assert.ok(updatedRecord);

    // Wait for the updated entry to be propagated to the other node.
    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);
        
    // Bob gets the updated Webpage
    const readUpdatedOutput0: Record = await bob.cells[0].callZome({
      zome_name: "webpage",
      fn_name: "get_latest_webpage",
      payload: updatedRecord.signed_action.hashed.hash,
    });
    assert.deepEqual(contentUpdate, decode((readUpdatedOutput0.entry as any).Present.entry) as any);

    // Alice updates the Webpage again
    contentUpdate = await sampleWebpage(alice.cells[0]);
    updateInput = { 
      original_webpage_hash: originalActionHash,
      previous_webpage_hash: updatedRecord.signed_action.hashed.hash,
      updated_webpage: contentUpdate,
    };

    updatedRecord = await alice.cells[0].callZome({
      zome_name: "webpage",
      fn_name: "update_webpage",
      payload: updateInput,
    });
    assert.ok(updatedRecord);

    // Wait for the updated entry to be propagated to the other node.
    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);
        
    // Bob gets the updated Webpage
    const readUpdatedOutput1: Record = await bob.cells[0].callZome({
      zome_name: "webpage",
      fn_name: "get_latest_webpage",
      payload: updatedRecord.signed_action.hashed.hash,
    });
    assert.deepEqual(contentUpdate, decode((readUpdatedOutput1.entry as any).Present.entry) as any);

    // Bob gets all the revisions for Webpage
    const revisions: Record[] = await bob.cells[0].callZome({
      zome_name: "webpage",
      fn_name: "get_all_revisions_for_webpage",
      payload: originalActionHash,
    });
    assert.equal(revisions.length, 3);
    assert.deepEqual(contentUpdate, decode((revisions[2].entry as any).Present.entry) as any);
  });
});

test('create and delete Webpage', async () => {
  await runScenario(async scenario => {
    // Construct proper paths for your app.
    // This assumes app bundle created by the `hc app pack` command.
    const testAppPath = process.cwd() + '/../workdir/web31.happ';

    // Set up the app to be installed 
    const appSource = { appBundleSource: { path: testAppPath } };

    // Add 2 players with the test app to the Scenario. The returned players
    // can be destructured.
    const [alice, bob] = await scenario.addPlayersWithApps([appSource, appSource]);

    // Shortcut peer discovery through gossip and register all agents in every
    // conductor of the scenario.
    await scenario.shareAllAgents();

    const sample = await sampleWebpage(alice.cells[0]);

    // Alice creates a Webpage
    const record: Record = await createWebpage(alice.cells[0], sample);
    assert.ok(record);

    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);


    // Alice deletes the Webpage
    const deleteActionHash = await alice.cells[0].callZome({
      zome_name: "webpage",
      fn_name: "delete_webpage",
      payload: record.signed_action.hashed.hash,
    });
    assert.ok(deleteActionHash);

    // Wait for the entry deletion to be propagated to the other node.
    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);
        
    // Bob gets the oldest delete for the Webpage
    const oldestDeleteForWebpage = await bob.cells[0].callZome({
      zome_name: "webpage",
      fn_name: "get_oldest_delete_for_webpage",
      payload: record.signed_action.hashed.hash,
    });
    assert.ok(oldestDeleteForWebpage);
        
    // Bob gets the deletions for the Webpage
    const deletesForWebpage = await bob.cells[0].callZome({
      zome_name: "webpage",
      fn_name: "get_all_deletes_for_webpage",
      payload: record.signed_action.hashed.hash,
    });
    assert.equal(deletesForWebpage.length, 1);


  });
});
