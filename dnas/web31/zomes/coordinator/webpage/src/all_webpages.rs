use hdk::prelude::*;
use webpage_integrity::*;
#[hdk_extern]
pub fn get_all_webpages(author: AgentPubKey) -> ExternResult<Vec<Link>> {
    get_links(author, LinkTypes::AllWebpages, None)
}
