use hdk::prelude::*;
use webpage_integrity::*;
#[hdk_extern]
pub fn create_webpage(webpage: Webpage) -> ExternResult<Record> {
    let webpage_hash = create_entry(&EntryTypes::Webpage(webpage.clone()))?;
    let record = get(webpage_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest(String::from("Could not find the newly created Webpage"))
            ),
        )?;
    let my_agent_pub_key = agent_info()?.agent_latest_pubkey;
    create_link(my_agent_pub_key, webpage_hash.clone(), LinkTypes::AllWebpages, ())?;
    let path = Path::from("global_webpages");
    create_link(
        path.path_entry_hash()?,
        webpage_hash.clone(),
        LinkTypes::GlobalWebpages,
        (),
    )?;
    Ok(record)
}
#[hdk_extern]
pub fn get_latest_webpage(
    original_webpage_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    let links = get_links(
        original_webpage_hash.clone(),
        LinkTypes::WebpageUpdates,
        None,
    )?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_webpage_hash = match latest_link {
        Some(link) => {
            link.target
                .clone()
                .into_action_hash()
                .ok_or(
                    wasm_error!(
                        WasmErrorInner::Guest(String::from("No action hash associated with link"))
                    ),
                )?
        }
        None => original_webpage_hash.clone(),
    };
    get(latest_webpage_hash, GetOptions::default())
}
#[hdk_extern]
pub fn get_original_webpage(
    original_webpage_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    let Some(details) = get_details(original_webpage_hash, GetOptions::default())? else {
        return Ok(None);
    };
    match details {
        Details::Record(details) => Ok(Some(details.record)),
        _ => {
            Err(
                wasm_error!(
                    WasmErrorInner::Guest(String::from("Malformed get details response"))
                ),
            )
        }
    }
}
#[hdk_extern]
pub fn get_all_revisions_for_webpage(
    original_webpage_hash: ActionHash,
) -> ExternResult<Vec<Record>> {
    let Some(original_record) = get_original_webpage(original_webpage_hash.clone())?
    else {
        return Ok(vec![]);
    };
    let links = get_links(
        original_webpage_hash.clone(),
        LinkTypes::WebpageUpdates,
        None,
    )?;
    let get_input: Vec<GetInput> = links
        .into_iter()
        .map(|link| Ok(
            GetInput::new(
                link
                    .target
                    .into_action_hash()
                    .ok_or(
                        wasm_error!(
                            WasmErrorInner::Guest(String::from("No action hash associated with link"))
                        ),
                    )?
                    .into(),
                GetOptions::default(),
            ),
        ))
        .collect::<ExternResult<Vec<GetInput>>>()?;
    let records = HDK.with(|hdk| hdk.borrow().get(get_input))?;
    let mut records: Vec<Record> = records.into_iter().filter_map(|r| r).collect();
    records.insert(0, original_record);
    Ok(records)
}
#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateWebpageInput {
    pub original_webpage_hash: ActionHash,
    pub previous_webpage_hash: ActionHash,
    pub updated_webpage: Webpage,
}
#[hdk_extern]
pub fn update_webpage(input: UpdateWebpageInput) -> ExternResult<Record> {
    let updated_webpage_hash = update_entry(
        input.previous_webpage_hash.clone(),
        &input.updated_webpage,
    )?;
    create_link(
        input.original_webpage_hash.clone(),
        updated_webpage_hash.clone(),
        LinkTypes::WebpageUpdates,
        (),
    )?;
    let record = get(updated_webpage_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest(String::from("Could not find the newly updated Webpage"))
            ),
        )?;
    Ok(record)
}
#[hdk_extern]
pub fn delete_webpage(original_webpage_hash: ActionHash) -> ExternResult<ActionHash> {
    let details = get_details(original_webpage_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest(String::from("{pascal_entry_def_name} not found"))
            ),
        )?;
    let record = match details {
        Details::Record(details) => Ok(details.record),
        _ => {
            Err(
                wasm_error!(
                    WasmErrorInner::Guest(String::from("Malformed get details response"))
                ),
            )
        }
    }?;
    let links = get_links(
        record.action().author().clone(),
        LinkTypes::AllWebpages,
        None,
    )?;
    for link in links {
        if let Some(hash) = link.target.into_action_hash() {
            if hash.eq(&original_webpage_hash) {
                delete_link(link.create_link_hash)?;
            }
        }
    }
    let path = Path::from("global_webpages");
    let links = get_links(path.path_entry_hash()?, LinkTypes::GlobalWebpages, None)?;
    for link in links {
        if let Some(hash) = link.target.into_action_hash() {
            if hash.eq(&original_webpage_hash) {
                delete_link(link.create_link_hash)?;
            }
        }
    }
    delete_entry(original_webpage_hash)
}
#[hdk_extern]
pub fn get_all_deletes_for_webpage(
    original_webpage_hash: ActionHash,
) -> ExternResult<Option<Vec<SignedActionHashed>>> {
    let Some(details) = get_details(original_webpage_hash, GetOptions::default())? else {
        return Ok(None);
    };
    match details {
        Details::Entry(_) => {
            Err(wasm_error!(WasmErrorInner::Guest("Malformed details".into())))
        }
        Details::Record(record_details) => Ok(Some(record_details.deletes)),
    }
}
#[hdk_extern]
pub fn get_oldest_delete_for_webpage(
    original_webpage_hash: ActionHash,
) -> ExternResult<Option<SignedActionHashed>> {
    let Some(mut deletes) = get_all_deletes_for_webpage(original_webpage_hash)? else {
        return Ok(None);
    };
    deletes
        .sort_by(|delete_a, delete_b| {
            delete_a.action().timestamp().cmp(&delete_b.action().timestamp())
        });
    Ok(deletes.first().cloned())
}
