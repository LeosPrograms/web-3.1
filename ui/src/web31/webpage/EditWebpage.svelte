<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import type { AppAgentClient, Record, EntryHash, AgentPubKey, DnaHash, ActionHash } from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import { clientContext } from '../../contexts';
import type { Webpage } from './types';
import '@material/mwc-button';
import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import '@material/mwc-textarea';
import '@material/mwc-textfield';

let client: AppAgentClient = (getContext(clientContext) as any).getClient();

const dispatch = createEventDispatcher();

export let originalWebpageHash!: ActionHash;

export let currentRecord!: Record;
let currentWebpage: Webpage = decode((currentRecord.entry as any).Present.entry) as Webpage;

let title: string | undefined = currentWebpage.title;
let html: string | undefined = currentWebpage.html;
let tags: Array<string | undefined> = currentWebpage.tags;

let errorSnackbar: Snackbar;

$: html, title, tags;
$: isWebpageValid = true && html !== '' && currentWebpage.title !== '' && currentWebpage.title !== undefined;
// $: isWebpageValid = true && html !== '' && tags.every(e => e !== '') && currentWebpage.title !== '' && currentWebpage.title !== undefined;

onMount(() => {
  if (currentRecord === undefined) {
    throw new Error(`The currentRecord input is required for the EditWebpage element`);
  }
  if (originalWebpageHash === undefined) {
    throw new Error(`The originalWebpageHash input is required for the EditWebpage element`);
  }
});

async function updateWebpage() {
  
  const webpage: Webpage = { 
    title: title!,
    html: html!,
    tags: tags as Array<string>,
    };
    
  console.log(webpage)
  try {
    const updateRecord: Record = await client.callZome({
      cap_secret: null,
      role_name: 'web31',
      zome_name: 'webpage',
      fn_name: 'update_webpage',
      payload: {
        original_webpage_hash: originalWebpageHash,
        previous_webpage_hash: currentRecord.signed_action.hashed.hash,
        updated_webpage: webpage
      }
    });

    console.log(updateRecord)
  
    dispatch('webpage-updated', { actionHash: updateRecord.signed_action.hashed.hash });
  } catch (e) {
    errorSnackbar.labelText = `Error updating the webpage: ${e.data.data}`;
    errorSnackbar.show();
  }
}

</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
<div style="display: flex; flex-direction: column">
  <span style="font-size: 18px">Edit Webpage</span>
  
  <!-- title -->
  <div style="margin-bottom: 16px">
    <textarea style="height: 20px;" placeholder="Title" value={ currentWebpage.title } on:input={e => { title = e.target.value;} } required></textarea>
  </div>
  <div style="margin-bottom: 16px">
    <textarea placeholder="html" value={ html } on:input={e => { html = e.target.value;} } required></textarea>    
  </div>

  <!-- <div style="margin-bottom: 16px">
    <div style="display: flex; flex-direction: column" >
      <span>Tags</span>
      
      {#each tags as el, i}
      <mwc-textfield outlined label="" value={ el } on:input={e => { tags[i] = e.target.value; } } ></mwc-textfield>
      {/each}
    
      <mwc-button icon="add" label="Add Tags" on:click={() => { tags = [...tags, '']; } }></mwc-button>
    </div>    
  </div> -->


  <div style="display: flex; flex-direction: row">
    <button
      outlined
      label="Cancel"
      on:click={() => dispatch('edit-canceled')}
      style="flex: 1; margin-right: 16px"
    >Cancel</button>
    <button 
      raised
      label="Save"
      disabled={!isWebpageValid}
      on:click={() => updateWebpage()}
      style="flex: 1;"
    >Save</button>
  </div>
</div>

<style>
  mwc-textarea {
    height: fit-content;
    width: 100%;
  }
  textarea {
    width: 100%;
    height: 200px;
    resize: vertical;
  }
</style>