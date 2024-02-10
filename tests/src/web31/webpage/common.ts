import { CallableCell } from '@holochain/tryorama';
import { NewEntryAction, ActionHash, Record, AppBundleSource, fakeActionHash, fakeAgentPubKey, fakeEntryHash, fakeDnaHash } from '@holochain/client';



export async function sampleWebpage(cell: CallableCell, partialWebpage = {}) {
    return {
        ...{
	  html: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
	  tags: ["Lorem ipsum dolor sit amet, consectetur adipiscing elit."],
        },
        ...partialWebpage
    };
}

export async function createWebpage(cell: CallableCell, webpage = undefined): Promise<Record> {
    return cell.callZome({
      zome_name: "webpage",
      fn_name: "create_webpage",
      payload: webpage || await sampleWebpage(cell),
    });
}

