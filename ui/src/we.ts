import { asyncDerived, pipe, sliceAndJoin, toPromise } from '@holochain-open-dev/stores';
import { LazyHoloHashMap } from '@holochain-open-dev/utils';
import type { AppletHash, AppletServices, AttachableInfo, Hrl, HrlWithContext, WeServices } from '@lightningrodlabs/we-applet';
import type { AppAgentClient, RoleName, ZomeName } from '@holochain/client';
import { getMyDna, hrlWithContextToB64 } from './util';
import { AppWebsocket, AppAgentWebsocket, AdminWebsocket } from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import type { Webpage } from './web31/webpage/types';

const appPort = import.meta.env.VITE_APP_PORT ? import.meta.env.VITE_APP_PORT : 8888
const adminPort = import.meta.env.VITE_ADMIN_PORT
const url = `ws://localhost:${appPort}`;

const ROLE_NAME = "web31"
const ZOME_NAME = "webpage"
const appId = import.meta.env.VITE_APP_ID ? import.meta.env.VITE_APP_ID : 'web31'

const ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" style="enable-background:new 0 0 64 64" xml:space="preserve"><path d="M6 12c0-3.3 2.7-6 6-6h40c3.3 0 6 2.7 6 6v40c0 3.3-2.7 6-6 6H12c-3.3 0-6-2.7-6-6V12z" style="fill:%23fff"/><path d="M4 12c0-4.4 3.6-8 8-8h8v16H8v12h12v12H8v2c0 2.8 5.1 5.1 12 5.8V44h12v7.4c4.4-.7 8.5-2 12-3.8V44h5.6c4-3.3 6.4-7.5 6.4-12h2v20c0 3.3-2.7 6-6 6h-8v2H12c-4.4 0-8-3.6-8-8V12zm28 20v12h12V32H32zm12 0h12V20H44v12zm0-12V8H32v12h12zm-12 0H20v12h12V20z" style="fill:%23acbdc5"/><path d="M32 56H20v-4.2c1.3.1 2.6.2 4 .2 2.8 0 5.4-.2 8-.6V56zm12-8.4V56h12V44h-6.4c-1.6 1.3-3.5 2.6-5.6 3.6z" style="fill:%23597380"/><path d="M20 4h32c4.4 0 8 3.6 8 8v40c0 4.4-3.6 8-8 8h-8v-4h8c2.2 0 4-1.8 4-4V12c0-2.2-1.8-4-4-4H20V4z" style="fill-rule:evenodd;clip-rule:evenodd;fill:%23314a52"/></svg>'
const CARD_ICON_SRC = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M0 96C0 60.7 28.7 32 64 32H448c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96zm64 0v64h64V96H64zm384 0H192v64H448V96zM64 224v64h64V224H64zm384 0H192v64H448V224zM64 352v64h64V352H64zm384 0H192v64H448V352z"/></svg>`
// const MINILOGO = '<svg width="200" height="100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="180" height="80" fill="darkgreen" stroke="lightgreen" stroke-width="5"/></svg>'
const SHEET_ICON_SRC = `data:image/svg+xml;utf8,
<svg fill="black" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
	 width="800px" height="800px" viewBox="0 0 482.81 482.81"
	 xml:space="preserve">
<g>
	<path d="M464.764,25.771H18.037C8.086,25.771,0,33.869,0,43.808v395.196c0,6.106,3.068,11.491,7.729,14.76v2.843h6.469
		c1.241,0.272,2.518,0.432,3.839,0.432h446.738c1.318,0,2.595-0.159,3.83-0.432h0.887v-0.271
		c7.654-2.093,13.317-9.032,13.317-17.331V43.813C482.81,33.869,474.717,25.771,464.764,25.771z M467.347,43.813v51.979H348.363
		v-54.56h116.4C466.194,41.233,467.347,42.392,467.347,43.813z M466.105,441.145H348.363V392.18h118.983v46.824
		C467.347,439.92,466.832,440.695,466.105,441.145z M15.457,439.004V392.18h55.842v48.965H16.698
		C15.971,440.695,15.457,439.92,15.457,439.004z M201.448,256.87v53.61H86.758v-53.61H201.448z M86.758,241.407v-57.99h114.689
		v57.99H86.758z M201.448,325.943v50.773H86.758v-50.773H201.448z M201.448,392.18v48.965H86.758V392.18H201.448z M216.913,392.18
		H332.9v48.965H216.913V392.18z M216.913,376.717v-50.779H332.9v50.779H216.913z M216.913,310.48v-53.61H332.9v53.61H216.913z
		 M216.913,241.407v-57.99H332.9v57.99H216.913z M216.913,167.954v-56.702H332.9v56.702H216.913z M216.913,95.787v-54.56H332.9
		v54.56H216.913z M201.448,95.787H86.758v-54.56h114.689V95.787z M201.448,111.252v56.702H86.758v-56.702H201.448z M71.299,167.954
		H15.457v-56.702h55.842V167.954z M71.299,183.417v57.99H15.457v-57.99H71.299z M71.299,256.87v53.61H15.457v-53.61H71.299z
		 M71.299,325.943v50.773H15.457v-50.773H71.299z M348.363,376.717v-50.779h118.983v50.779H348.363z M348.363,310.48v-53.61h118.983
		v53.61H348.363z M348.363,241.407v-57.99h118.983v57.99H348.363z M348.363,167.954v-56.702h118.983v56.702H348.363z"/>
</g>
</svg>`

const SHEET_ICON_SRC2 = `data:image/svg+xml;utf8,
<svg fill="black" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
	 viewBox="0 0 482.81 482.81"
	 xml:space="preserve">
<g>
  <path class="st0" d="M283.276,454.904c-4.739,3.858-9.502,6.888-14.295,9.177c-3.256,0.348-6.533,0.603-9.827,0.796v-38.201
      c-7.878-6.448-15.802-13.144-23.751-20.024v58.232c-3.293-0.2-6.571-0.456-9.818-0.804c-4.794-2.289-9.564-5.32-14.303-9.177
      c-15.447-12.572-29.905-33.794-40.992-61.108h50.486c-8.605-7.693-17.218-15.618-25.83-23.75h-32.959
      c-3.936-13.09-7.104-27.207-9.517-42.013c-9.378-9.703-18.486-19.429-27.331-29.139c1.987,25.281,6.061,49.264,12.13,71.152H76.602
      c-16.986-27.454-27.516-59.276-29.511-93.464h58.24c-6.881-7.948-13.577-15.873-20.017-23.751H47.092
      c0.819-14.009,3.147-27.586,6.68-40.66c-8.064-11.001-15.626-21.84-22.599-32.456c-10.368,26.333-16.127,54.986-16.127,84.999
      c0.007,128.262,103.963,232.21,232.226,232.218c30.005,0,58.658-5.759,84.982-16.119c-14.14-9.301-28.691-19.638-43.488-30.84
      C286.948,451.726,285.124,453.397,283.276,454.904z M105.456,406.53c-4.067-4.067-7.933-8.335-11.636-12.734h51.158
      c3.811,10.391,8.002,20.287,12.694,29.379c5.528,10.685,11.652,20.403,18.339,29.016
      C149.307,442.039,125.325,426.384,105.456,406.53z"/>
    <path class="st0" d="M78.442,105.348c5.072,9.084,10.839,18.548,17.187,28.296c3.17-3.68,6.386-7.314,9.826-10.754
      c19.908-19.893,43.945-35.58,70.71-45.731c-12.44,15.973-22.9,35.788-31.226,58.457H96.89c5.086,7.746,10.568,15.679,16.374,23.75
      h24.068c-2.188,7.878-4.067,16.074-5.76,24.454c6.363,8.18,13.02,16.452,19.947,24.787c2.498-17.458,6.007-34.042,10.585-49.242
      h73.3v93.464h-45.12c7.338,7.94,14.852,15.865,22.545,23.751h22.575v22.576c7.886,7.685,15.811,15.215,23.751,22.544v-45.12h87.751
      c-0.974,34.095-6.146,65.918-14.442,93.464h-17.388c11.412,9.192,22.676,17.844,33.694,25.876c0.271-0.727,0.587-1.392,0.858-2.126
      h51.112c-3.711,4.399-7.569,8.667-11.636,12.734c-3.433,3.432-7.036,6.695-10.716,9.864c9.734,6.34,19.181,12.092,28.243,17.164
      c44.849-42.336,72.883-102.301,72.883-168.844C479.505,136.451,375.542,32.488,247.272,32.48
      C180.728,32.488,120.779,60.514,78.442,105.348z M417.956,370.046h-60.73c7.84-28.259,12.587-59.88,13.507-93.464h76.734
      C445.472,310.77,434.942,342.591,417.956,370.046z M417.94,159.366c16.994,27.454,27.524,59.284,29.526,93.464h-76.811
      c-0.928-33.554-5.535-65.222-13.375-93.464H417.94z M389.094,122.89c4.067,4.067,7.925,8.327,11.628,12.726H349.58
      c-3.811-10.383-8.01-20.279-12.695-29.371c-5.528-10.677-11.651-20.395-18.331-29.016C345.25,87.38,369.226,103.044,389.094,122.89
      z M259.154,64.534c3.301,0.201,6.58,0.456,9.834,0.804c4.794,2.281,9.548,5.312,14.288,9.169
      c15.447,12.564,29.897,33.794,40.984,61.108h-65.106V64.534z M259.154,159.366h73.409c8.296,27.539,13.437,59.4,14.419,93.464
      h-87.828V159.366z M211.282,74.507c4.739-3.858,9.494-6.888,14.288-9.177c3.254-0.348,6.533-0.603,9.833-0.804v71.09h-64.982
      c2.621-6.472,5.374-12.718,8.35-18.47C188.312,98.652,199.538,84.102,211.282,74.507z"/>
    <path class="st0" d="M503.055,424.249c-4.809-12.966-11.489-26.982-19.668-41.842c-5.59,11.149-11.929,21.872-18.981,32.062
      c3.58,7.399,6.58,14.357,8.953,20.774c4.832,12.95,7.012,23.75,6.973,30.972c0,3.425-0.456,5.999-1.052,7.732
      c-0.602,1.739-1.236,2.644-1.963,3.394c-0.735,0.711-1.632,1.337-3.379,1.948c-1.724,0.587-4.298,1.043-7.724,1.043
      c-6.819,0.031-16.838-1.894-28.83-6.185c-12.014-4.26-26.031-10.778-41.408-19.328c-52.72-29.302-121.196-82.509-188.714-150.073
      C139.698,237.229,86.491,168.752,57.181,116.024c-8.55-15.378-15.06-29.387-19.328-41.402c-4.283-11.991-6.216-22.01-6.185-28.83
      c0-3.433,0.464-6.007,1.052-7.724c0.603-1.747,1.23-2.636,1.948-3.378c0.758-0.734,1.654-1.369,3.402-1.971
      c1.724-0.588,4.298-1.052,7.739-1.052c7.213-0.038,18.014,2.142,30.941,6.959c6.44,2.381,13.43,5.396,20.868,8.983
      c10.19-7.051,20.889-13.39,32.046-18.98c-14.891-8.204-28.938-14.891-41.927-19.7c-15.2-5.59-29-8.884-41.927-8.93
      C39.662,0.008,33.662,0.781,27.91,2.722c-5.736,1.932-11.211,5.133-15.64,9.586c-4.438,4.414-7.631,9.881-9.549,15.61
      C0.781,33.662,0.008,39.654,0,45.793c0.039,12.216,2.984,25.196,8.017,39.43c5.056,14.218,12.3,29.65,21.493,46.195
      c31.497,56.523,86.112,126.438,155.361,195.718C254.152,396.386,324.067,451,380.582,482.498
      c16.553,9.192,31.985,16.436,46.203,21.493c14.233,5.026,27.214,7.971,39.429,8.01c6.139,0,12.131-0.781,17.876-2.714
      c5.721-1.924,11.187-5.11,15.609-9.548c4.454-4.438,7.654-9.912,9.58-15.633c1.94-5.752,2.714-11.752,2.721-17.89
      C511.954,453.273,508.66,439.465,503.055,424.249z"/>
</g>
</svg>`

export const appletServices: AppletServices = {
    // Types of attachment that this Applet offers for other Applets to attach
    // attachmentTypes: async (
    //   appletClient: AppAgentClient,
    //   appletHash: AppletHash,
    //   weServices: WeServices
    // ) => ({
      // No way to specify the context so we can't create a board.
      // webpage: {
      //   label: "Webpage",
      //   icon_src: CARD_ICON_SRC,
        // async create(attachToHrlWithContext: HrlWithContext) {
        //   const hrlB64 = hrlWithContextToB64(attachToHrlWithContext)
        //   const dnaHash = await getMyDna(ROLE_NAME, appletClient)
        //   console.log("context", attachToHrlWithContext)

          // const deliberationEntry: Deliberation = { 
          //   title: attachToHrlWithContext.context.title!,
          //   description: attachToHrlWithContext.context.description!,
          //   settings: JSON.stringify(attachToHrlWithContext.context.settings!),
          //   attachments: [hrlB64]
          // };

          // const deliberationEntry: Deliberation = { 
          //   title: "Deliberation",
          //   description: "",
          //   settings: "",
          //   attachments: [{
          //     hrl: JSON.stringify(hrlB64.hrl),
          //     context: JSON.stringify("attachToHrlWithContext.context")
          //   }]
          // };
        
          // console.log("createDeliberation", "deliberationEntry")
          // let record;

          // try {
          //   record = await appletClient.callZome({
          //     cap_secret: null,
          //     role_name: 'converge',
          //     zome_name: 'converge',
          //     fn_name: 'create_deliberation',
          //     payload: deliberationEntry,
          //   });
        
          //   // join deliberation
          //   await appletClient.callZome({
          //     cap_secret: null,
          //     role_name: 'converge',
          //     zome_name: 'converge',
          //     fn_name: 'add_deliberation_for_deliberator',
          //     payload: {
          //       base_deliberator: appletClient.myPubKey,
          //       target_deliberation_hash: record.signed_action.hashed.hash
          //     },
          //   });
          // } catch (e) {
          //   console.log(e)
          // }

          // console.log("hash", record.signed_action.hashed.hash)

          // return {
          //   hrl: [dnaHash, record.signed_action.hashed.hash],
          // };
        // },
        // hrl: ["dnaHash", "hash"],
      // },
    // }),
    // Types of UI widgets/blocks that this Applet supports
    blockTypes: {},
    getAttachableInfo: async (
      appletClient: AppAgentClient,
      roleName: RoleName,
      integrityZomeName: ZomeName,
      entryType: string,
      hrlWithContext: HrlWithContext
    ): Promise<AttachableInfo | undefined> => {
        let dnaHash = await getMyDna(ROLE_NAME, appletClient)
        let webpage: Webpage;
        let record: any;

        try {
          // console.log(hrlWithContext.hrl[1])
          record = await appletClient.callZome({
            cap_secret: null,
            role_name: 'web31',
            zome_name: 'webpage',
            fn_name: 'get_latest_webpage',
            payload: hrlWithContext.hrl[1],
          });
          if (record) {
            // console.log(record)
            webpage = decode((record.entry as any).Present.entry) as Webpage;
            // console.log(webpage)
          }
        } catch (e) {
          console.log(e)
        }

        console.log({
          icon_src: SHEET_ICON_SRC2,
          name: webpage.title,
        })

        return {
          icon_src: SHEET_ICON_SRC2,
          name: webpage.title,
        };
    },
    search: async (
      appletClient: AppAgentClient,
      appletHash: AppletHash,
      weServices: WeServices,
      searchFilter: string
    ): Promise<Array<HrlWithContext>> => {
      let hashes: HrlWithContext[];
      let dnaHash = await getMyDna(ROLE_NAME, appletClient)

      try {
        console.log("searchFilter", searchFilter)
        const records = await appletClient.callZome({
          cap_secret: null,
          role_name: 'web31',
          zome_name: 'webpage',
          fn_name: 'search_webpages',
          payload: searchFilter,
        });
        console.log(records)
        hashes = records
        .map((r) => ({ hrl: [dnaHash, r], context: {} }));
      } catch (e) {
        console.log(e)
      }
      return hashes
    },
};