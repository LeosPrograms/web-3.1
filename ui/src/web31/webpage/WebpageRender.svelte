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

<mwc-snackbar bind:this={errorSnackbar} leading>
</mwc-snackbar>

{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <mwc-circular-progress indeterminate></mwc-circular-progress>
</div>
{:else if error}
<span>Error fetching the webpage: {error.data.data}</span>
{:else}
<div class="row-container">
  <!-- <div class="first-row"> -->
    <!-- <p>Some text</p>
    <p>And some more text</p> -->
  <!-- </div> -->
  <div class="second-row">
    <iframe srcdoc={webpage.html}></iframe>
  </div>
</div>
<!-- <iframe srcdoc={webpage.html} class="second-row"></iframe> -->
{/if}

<style>
  iframe {
    border: none;
    background-color: white;
  }
  iframe > html {
    height: fit-content;
  }

  body, html {width: 100%; height: 100%; margin: 0; padding: 0}
  .first-row {position: absolute;top: 0; left: 0; right: 0; height: 0px; background-color: lime;}
  .second-row {position: absolute; top: 0px; left: 0; right: 0; bottom: 0; background-color: red }
  .second-row iframe {display: block; width: 100%; height: 100%; border: none;}
</style>