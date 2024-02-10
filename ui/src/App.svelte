<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import { view, viewHash, navigate, setWeClient } from './store.js';
  import type { ActionHash, AppAgentClient } from '@holochain/client';
  import { AppWebsocket, AppAgentWebsocket, AdminWebsocket } from '@holochain/client';
  import '@material/mwc-circular-progress';
  import { FileStorageClient } from "@holochain-open-dev/file-storage";
  import { clientContext } from './contexts';
  import CreateFacetGroup from './web31/web31/CreateFacetGroup.svelte';
  import AllGroups from './web31/web31/AllGroups.svelte';
  import { WeClient, isWeContext, initializeHotReload, type HrlWithContext, type Hrl } from '@lightningrodlabs/we-applet';  
  import "@holochain-open-dev/file-storage/dist/elements/file-storage-context.js";
  import "@holochain-open-dev/file-storage/dist/elements/upload-files.js";
  import { appletServices } from './we';
  import CreateWebpage from './web31/webpage/CreateWebpage.svelte';
  import AllWebpages from './web31/webpage/AllWebpages.svelte';
    import WebpageDetail from './web31/webpage/WebpageDetail.svelte';
    import WebpageRender from './web31/webpage/WebpageRender.svelte';
    import GlobalWebpages from './web31/webpage/GlobalWebpages.svelte';
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';

  const appId = import.meta.env.VITE_APP_ID ? import.meta.env.VITE_APP_ID : 'web31'
  const roleName = 'web31'
  const appPort = import.meta.env.VITE_APP_PORT ? import.meta.env.VITE_APP_PORT : 8888
  const adminPort = import.meta.env.VITE_ADMIN_PORT
  const url = `ws://localhost:${appPort}`;

  let client: AppAgentClient | undefined;
  let connected = false;
  let weClient: WeClient | undefined;
  let loading = true;
  let fileStorageClient: FileStorageClient | undefined;
  let dialog;
  let currentView;
  let webpageHash;

  export const close=()=>{dialog.hide()}
  export const open= async (c: any)=>{
    // card = c
    // if (card) {
    //   attachments = card.props.attachments ? cloneDeep(card.props.attachments): []
    // } else {
      // attachments = activeBoard.state().props.attachments
    // }
    // await bind.refresh()
    dialog.show()
  }

  $: client, loading, currentView, webpageHash;

  async function initialize() : Promise<void> {
    console.log(import.meta.env)
    // let profilesClient
    if ((import.meta as any).env.DEV) {
      try {
        await initializeHotReload();
      } catch (e) {
        console.warn("Could not initialize applet hot-reloading. This is only expected to work in a We context in dev mode.")
      }
    }
    if (!isWeContext()) {
      console.log("adminPort is", adminPort)
      if (adminPort) {
        const adminWebsocket = await AdminWebsocket.connect(new URL(`ws://localhost:${adminPort}`))
        const x = await adminWebsocket.listApps({})
        console.log("apps", x)
        const cellIds = await adminWebsocket.listCellIds()
        console.log("CELL IDS",cellIds)
        await adminWebsocket.authorizeSigningCredentials(cellIds[0])
      }
      console.log("appPort and Id is", appPort, appId)
      client = await AppAgentWebsocket.connect(new URL(url), appId)
      // profilesClient = new ProfilesClient(client, appId);
    
      // client = await AppAgentWebsocket.connect('', 'dcan');
      // profilesStore = new ProfilesStore(new ProfilesClient(client, 'converge'), {
      //   avatarMode: "avatar-optional",
      //   minNicknameLength: 3,
      // });
    }
    else {
      // const weClient = await WeClient.connect();
      weClient = await WeClient.connect(appletServices);
      // store set
      setWeClient(weClient)
      // weClient = await WeClient.connect();

      switch (weClient.renderInfo.type) {
        case "applet-view":
          switch (weClient.renderInfo.view.type) {
            case "main":
              // here comes your rendering logic for the main view
              break;
            case "block":
              switch(weClient.renderInfo.view.block) {
                case "active_boards":
                  renderType = RenderType.BlockActiveBoards
                  break;
                default:
                  throw new Error("Unknown applet-view block type:"+weClient.renderInfo.view.block);
              }
              break;
            case "attachable":
              switch (weClient.renderInfo.view.roleName) {
                case "web31":
                  switch (weClient.renderInfo.view.integrityZomeName) {
                    case "webpage_integrity":
                      switch (weClient.renderInfo.view.entryType) {
                        case "webpage":
                          currentView = "webpage"
                          webpageHash = weClient.renderInfo.view.hrlWithContext.hrl[1]
                          // currentHash = weClient.renderInfo.view.hrlWithContext.hrl[1]
                          // console.log("weClient.renderInfo.view", weClient.renderInfo.view)
                          // hrlWithContext = weClient.renderInfo.view.hrlWithContext
                          break;
                        default:
                          throw new Error("Unknown entry type:"+weClient.renderInfo.view.entryType);
                      }
                      break;
                    default:
                      throw new Error("Unknown integrity zome:"+weClient.renderInfo.view.integrityZomeName);
                  }
                  break;
                default:
                  throw new Error("Unknown role name:"+weClient.renderInfo.view.roleName);
              }
              break;
            default:
              throw new Error("Unsupported applet-view type");
          }
          break;
        case "cross-applet-view":
          switch (this.weClient.renderInfo.view.type) {
            case "main":
              // here comes your rendering logic for the cross-applet main view
              //break;
            case "block":
              //
              //break;
            default:
              throw new Error("Unknown cross-applet-view render type.")
          }
          break;
        default:
          throw new Error("Unknown render view type");

      }
      
      //@ts-ignore
      client = weClient.renderInfo.appletClient;
      //@ts-ignore
      // profilesClient = weClient.renderInfo.profilesClient;
    }
    // profilesStore = new ProfilesStore(profilesClient);
    connected = true
  }

  onMount(async () => {
    console.log("here on mount !")
    // We pass '' as url because it will dynamically be replaced in launcher environments
    // client = await AppAgentWebsocket.connect('', 'web31');
    fileStorageClient = new FileStorageClient(client, 'web31');
    await initialize()
    console.log("here after mount !")
    loading = false;
  });

  setContext(clientContext, {
    getClient: () => client,
  });
</script>

<main>
  {#if loading}
  <div style="display: flex; flex: 1; align-items: center; justify-content: center">
    <mwc-circular-progress indeterminate />
  </div>
  {:else if connected}
    {#if currentView === "webpage"}
      <WebpageRender webpageHash={webpageHash} />
    {:else}
      <!-- {:else if fileStorageClient} -->
      <h1>Web 3.1</h1>
      <h2>
        web 1.0 on web 3.0
      </h2>
      <!-- <br>
        file storage
        <file-storage-context client={fileStorageClient}>
          <upload-files></upload-files>
        </file-storage-context> -->
        
        <br>
        <sl-button on:click={()=>{console.log("hi"); dialog.show()}}>Create Webpage</sl-button>
        <br>
        <br>

        <sl-dialog label={"Create Webpage using HTML/CSS/JS"} bind:this={dialog}>
          <CreateWebpage on:webpage-created={()=>{
            close()
          }} />
        </sl-dialog>
        
        <!-- <AllWebpages author={client.myPubKey} /> -->
        <GlobalWebpages />
      {/if}
  {:else}
    <p>Failed to connect to the Holochain conductor</p>
  {/if}
</main>

<style>
  /* main { */
    /* background-color: brown; */
  /* } */
  body {
    margin: 0 !important;
    padding: 0 !important;
  }
  sl-dialog::part(panel) {
    background: #FFFFFF;
    border: 2px solid rgb(166 115 55 / 26%);
    border-bottom: 2px solid rgb(84 54 19 / 50%);
    border-top: 2px solid rgb(166 115 55 / 5%);
    box-shadow: 0px 15px 40px rgb(130 107 58 / 35%);
    border-radius: 10px;
    position: relative;
    z-index: 99999999999999;
    padding: 20px;
  }
</style>
<head>
  <link rel="stylesheet" href="path/to/shoelace/dist/themes/light.css" />
</head>