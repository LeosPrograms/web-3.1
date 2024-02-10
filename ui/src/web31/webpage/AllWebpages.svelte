<script lang="ts">
import { onMount, getContext } from 'svelte';
import '@material/mwc-circular-progress';
import type { EntryHash, Record, AgentPubKey, ActionHash, AppAgentClient, NewEntryAction } from '@holochain/client';
import { clientContext } from '../../contexts';
import WebpageDetail from './WebpageDetail.svelte';
import type { WebpageSignal } from './types';

export let author: AgentPubKey;

let client: AppAgentClient = (getContext(clientContext) as any).getClient();

let hashes: Array<ActionHash> | undefined;
let loading = true;
let error: any = undefined;

$: hashes, loading, error;

onMount(async () => {
    if (author === undefined) {
      throw new Error(`The author input is required for the AllWebpages element`);
    }


  await fetchWebpages();
  client.on('signal', signal => {
    if (signal.zome_name !== 'webpage') return;
    const payload = signal.payload as WebpageSignal;
    if (payload.type !== 'EntryCreated') return;
    if (payload.app_entry.type !== 'Webpage') return;
    if (author.toString() !== client.myPubKey.toString()) return;
    hashes = [...hashes, payload.action.hashed.hash];
  });
});

async function fetchWebpages() {
  try {
    const links = await client.callZome({
      cap_secret: null,
      role_name: 'web31',
      zome_name: 'webpage',
      fn_name: 'get_all_webpages',
      payload: author,
    });
    hashes = links.map(l => l.target);
  } catch (e) {
    error = e;
  }
  loading = false;
}

</script>

{#if loading}
<div style="display: flex; flex: 1; align-items: center; justify-content: center">
  <mwc-circular-progress indeterminate></mwc-circular-progress>
</div>
{:else if error}
<span>Error fetching the webpages: {error.data.data}.</span>
{:else if hashes.length === 0}
<span>No webpages found for this author.</span>
{:else}
<div style="display: flex; flex-direction: column">
  {#each hashes as hash}
    <div style="margin-bottom: 8px;">
      <WebpageDetail webpageHash={hash}  on:webpage-deleted={() => fetchWebpages()}></WebpageDetail>
    </div>
  {/each}
</div>
{/if}

