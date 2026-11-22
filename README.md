# supply
$DROP XRPL supply

## Supply feeds

- `https://xrp-drop.com/supply/supply.json` returns the full JSON feed.
- `https://xrp-drop.com/supply/total-supply.txt` returns issued/outstanding supply as a plain decimal number.
- `https://xrp-drop.com/supply/circulating-supply.txt` returns circulating supply as a plain decimal number.
- `https://xrp-drop.com/supply/max-supply.txt` returns the fixed 1,000,000 DROP cap as a plain decimal number.

The numeric endpoints contain only the number and a trailing newline. CMC's total supply endpoint uses `issued_supply`; max supply uses the fixed cap. Circulating supply currently equals issued supply because the project reports that all issued DROP is community-held and no team/reserve allocations are excluded.

For CoinMarketCap, connect `total-supply.txt` to **Total Supply** and `circulating-supply.txt` to **Self-Reported Circulating Supply**. Enter the fixed maximum supply as `1,000,000`; this form does not need a maximum-supply API URL. CoinGecko's supply update form also uses `total-supply.txt` and `circulating-supply.txt` for its two API fields, with maximum supply entered as a fixed number. The existing top-holder list URL in CoinGecko remains the XRPL block explorer URL and is not a supply endpoint.

The 15-minute GitHub Actions workflow publishes each generated snapshot to the existing website through its authenticated feed-publish endpoint when `DROP_SUPPLY_PUBLISH_TOKEN` is configured. It also commits the same files to `docs/`, keeping the legacy GitHub Pages feeds live for existing consumers. Until the website has a published snapshot, its public feed routes fall back to the validated GitHub Pages files. The official website links only to the `xrp-drop.com` feeds; the legacy URLs are maintained for compatibility, not advertised.

To enable direct website snapshots, set the same high-entropy `DROP_SUPPLY_PUBLISH_TOKEN` in the Vercel production environment and in this repository's GitHub Actions secrets. Never commit or print the token. Without it, the workflow still updates GitHub Pages and the website serves that current validated snapshot as a fallback. Keep GitHub Pages enabled while CoinMarketCap and other consumers still use the legacy URLs.

Legacy feeds retained for compatibility:

- `https://teamdrop589.github.io/supply/supply.json`
- `https://teamdrop589.github.io/supply/total-supply.txt`
- `https://teamdrop589.github.io/supply/circulating-supply.txt`
- `https://teamdrop589.github.io/supply/max-supply.txt`
