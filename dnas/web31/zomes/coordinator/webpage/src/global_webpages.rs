use hdk::prelude::*;
use webpage_integrity::*;
#[hdk_extern]
pub fn get_global_webpages(_: ()) -> ExternResult<Vec<Link>> {
    let path = Path::from("global_webpages");
    get_links(path.path_entry_hash()?, LinkTypes::GlobalWebpages, None)
}

#[hdk_extern]
pub fn search_webpages(query: String) -> ExternResult<Vec<ActionHash>> {
    let path = Path::from("global_webpages");
    let links = get_links(path.path_entry_hash()?, LinkTypes::GlobalWebpages, None)?;
    let get_input: Vec<GetInput> = links
        .into_iter()
        .map(|link| GetInput::new(
            ActionHash::try_from(link.target)
                .map_err(|_| {
                    wasm_error!(WasmErrorInner::Guest("Expected actionhash".into()))
                })
                .unwrap()
                .into(),
            GetOptions::default(),
        ))
        .collect();
    let records = HDK.with(|hdk| hdk.borrow().get(get_input))?;
    let records: Vec<Record> = records.into_iter().filter_map(|r| r).collect();
    let mut output: Vec<ActionHash> = vec![];
    for item in records.iter() {
        emit_signal(item.clone())?;
        let webpage: Webpage = item
            .entry()
            .to_app_option()
            .map_err(|err| wasm_error!(err))?
            .ok_or(
                wasm_error!(
                    WasmErrorInner::Guest("Could not deserialize record to Webpage."
                    .into(),)
                ),
            )?;
        if webpage.title.contains(&query)
        {
            output.push(item.signed_action.as_hash().to_owned());
        }
    }
    Ok(output)
}
