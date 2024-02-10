<script lang="ts">
import { createEventDispatcher, getContext, onMount } from 'svelte';
import type { AppAgentClient, Record, EntryHash, AgentPubKey, ActionHash, DnaHash } from '@holochain/client';
import { clientContext } from '../../contexts';
import type { Webpage } from './types';
import '@material/mwc-button';
import '@material/mwc-snackbar';
import type { Snackbar } from '@material/mwc-snackbar';
import '@material/mwc-textfield';

import '@material/mwc-textarea';
let client: AppAgentClient = (getContext(clientContext) as any).getClient();

const dispatch = createEventDispatcher();


let title: string = '';
let html: string = '';
let tags: Array<string> = [''];

let errorSnackbar: Snackbar;

$: html, tags, title;
$: isWebpageValid = true && html !== '' && title !== '';
// $: isWebpageValid = true && html !== '' && tags.every(e => e !== '');

onMount(() => {
});

async function createWebpage() {  
  const webpageEntry: Webpage = { 
    title: title!,
    html: html!,
    tags: tags,
  };
  
  try {
    const record: Record = await client.callZome({
      cap_secret: null,
      role_name: 'web31',
      zome_name: 'webpage',
      fn_name: 'create_webpage',
      payload: webpageEntry,
    });
    dispatch('webpage-created', { webpageHash: record.signed_action.hashed.hash });
  } catch (e) {
    errorSnackbar.labelText = `Error creating the webpage: ${e.data.data}`;
    errorSnackbar.show();
  }
}

</script>
<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>
<div style="display: flex; flex-direction: column; width: 91%;">
  <!-- <span style="font-size: 18px">Create Webpage using HTML/CSS</span> -->
  
  <div style="margin-bottom: 16px">
    <textarea style="height: 20px;" placeholder="Title" value={ title } on:input={e => {title = e.target.value;}} required></textarea>
  </div>
  <div style="margin-bottom: 16px">
    <textarea style="width: 100%;" placeholder="Html" value={ html } on:input={e => { html = e.target.value;} }></textarea>          
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
            

  <button 
    raised
    label="Create Webpage"
    disabled={!isWebpageValid}
    on:click={() => createWebpage()}
  >Create</button>
</div>

<style>
  mwc-textfield, textarea {
    width: 100%;
  }
  textarea {
    height: 200px;
    resize: vertical;
  }
  mwc-button {
    margin-top: 16px;
  }
  span {
    margin-bottom: 16px;
  }
  div {
    margin-bottom: 16px;
  }
  iframe {
    width: 100%;
    height: fit-content;
    border: 1px solid #000;
  }
  .flex-row {
    display: flex;
    flex-direction: row;
  }
  .flex-column {
    display: flex;
    flex-direction: column;
  }
  .flex-1 {
    flex: 1;
  }
  .margin-left-8 {
    margin-left: 8px;
  }
  .margin-bottom-16 {
    margin-bottom: 16px;
  }
  .margin-right-4 {
    margin-right: 4
  }
</style>