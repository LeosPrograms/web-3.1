<script lang="ts">
import { createEventDispatcher, onMount, getContext } from 'svelte';
import '@material/mwc-circular-progress';
import { decode } from '@msgpack/msgpack';
import type { Record, ActionHash, AppAgentClient, EntryHash, AgentPubKey, DnaHash } from '@holochain/client';
import { clientContext } from '../../contexts';
import type { Webpage } from './types';
import '@material/mwc-circular-progress';
import type { Snackbar } from '@material/mwc-snackbar';
import '@material/mwc-snackbar';
import '@material/mwc-icon-button';
import { weClientStored } from '../../store.js';
import type { HrlWithContext } from "@lightningrodlabs/we-applet";
import EditWebpage from './EditWebpage.svelte'; 
  import { getMyDna, hrlWithContextToB64 } from '../../util';

const dispatch = createEventDispatcher();

let dna;

let weClient;
weClientStored.subscribe(value => {
  weClient = value;
});

export let webpageHash: ActionHash;

let client: AppAgentClient = (getContext(clientContext) as any).getClient();

let loading = true;
let error: any = undefined;

let record: Record | undefined;
let webpage: Webpage | undefined;

let editing = false;

let errorSnackbar: Snackbar;
  
$: editing,  error, loading, record, webpage;

const openWebpageHrl = async function (webpageHash: ActionHash) {
  const hrl: HrlWithContext = {
    hrl: [dna, webpageHash],
    context: {},
  };
  // const b64 = hrlWithContextToB64(hrl);
  weClient.openHrl(hrl);
}

onMount(async () => {
  dna = await getMyDna("web31", client);
  if (webpageHash === undefined) {
    throw new Error(`The webpageHash input is required for the WebpageDetail element`);
  }
  await fetchWebpage();
});

async function fetchWebpage() {
  loading = true;
  error = undefined;
  record = undefined;
  webpage = undefined;
  
  try {
    record = await client.callZome({
      cap_secret: null,
      role_name: 'web31',
      zome_name: 'webpage',
      fn_name: 'get_latest_webpage',
      payload: webpageHash,
    });
    if (record) {
      webpage = decode((record.entry as any).Present.entry) as Webpage;
    }
  } catch (e) {
    error = e;
  }

  loading = false;
}

async function deleteWebpage() {
  try {
    await client.callZome({
      cap_secret: null,
      role_name: 'web31',
      zome_name: 'webpage',
      fn_name: 'delete_webpage',
      payload: webpageHash,
    });
    dispatch('webpage-deleted', { webpageHash: webpageHash });
  } catch (e: any) {
    errorSnackbar.labelText = `Error deleting the webpage: ${e.data.data}`;
    errorSnackbar.show();
  }
}
</script>

<!-- <mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar> -->

{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <mwc-circular-progress indeterminate></mwc-circular-progress>
</div>
{:else if error}
<span>Error fetching the webpage: {error.data.data}</span>
{:else if editing}
<EditWebpage
  originalWebpageHash={ webpageHash}
  currentRecord={record}
  on:webpage-updated={async () => {
    editing = false;
    await fetchWebpage()
  } }
  on:edit-canceled={() => { editing = false; } }
></EditWebpage>
{:else}


  <tr>
    <td>
      <a href="#" on:click={()=>{
      openWebpageHrl(webpageHash)
    }}>{webpage.title}</a>
    </td>

    <!-- <td> -->
      <!-- <button on:click={()=>{
      editing = true;
    }}>edit</button> -->
    <!-- </td> -->

    <td>
      <button on:click={()=>{
        editing = true;
      }}>edit</button> 

    <!-- </td>
    <td> -->
      <button on:click={()=>{
      deleteWebpage()
    }}>delete</button>
      <!-- <mwc-icon-button style="margin-left: 8px" icon="edit" on:click={() => { editing = true; } }></mwc-icon-button> -->
      <!-- <mwc-icon-button style="margin-left: 8px" icon="delete" on:click={() => deleteWebpage()}></mwc-icon-button> -->
    </td>
  </tr>

<!-- <div style="display: flex; flex-direction: column"> -->
  <!-- <div style="display: flex; flex-direction: row">
    <a href="#" on:click={()=>{
      openWebpageHrl(webpageHash)
    }}>{webpage.title}</a>
    <span style="flex: 1"></span>
    <mwc-icon-button style="margin-left: 8px" icon="edit" on:click={() => { editing = true; } }></mwc-icon-button>
    <mwc-icon-button style="margin-left: 8px" icon="delete" on:click={() => deleteWebpage()}></mwc-icon-button>
  </div> -->

  <!-- <div style="display: flex; flex-direction: row; margin-bottom: 16px"> -->
    <!-- <span style="margin-right: 4px"><strong>Html:</strong></span> -->
    <!-- <span style="white-space: pre-line">{ webpage.html }</span> -->
    <!-- <iframe srcdoc={webpage.html} style="width: 100%; max-height: 100px; border: 1px solid #000"></iframe> -->
  <!-- </div> -->

  <!-- <div style="display: flex; flex-direction: column; margin-bottom: 16px">
    <span><strong>Tags</strong></span>
    
    {#each webpage.tags as el}
      <span style="white-space: pre-line">{ el }</span>
    {/each}
  </div> -->
<!-- </div> -->
{/if}

<style>
  tr:nth-child(even) {
    background-color: #dddddd;
  }

  td:nth-child(even) {
    /* width: 100%; */
    background-color: white;
    border: 0;
  }

  td, th {
	border: 1px solid #dddddd;
	text-align: left;
	padding: 0 8px;
}
</style>