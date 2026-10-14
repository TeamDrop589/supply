# supply
$DROP XRPL supply

## Supply feeds

- `https://teamdrop589.github.io/supply/supply.json` returns the full JSON feed.
- `https://teamdrop589.github.io/supply/total-supply.txt` returns the current issued/outstanding supply as a plain decimal number for CMC.
- `https://teamdrop589.github.io/supply/circulating-supply.txt` returns circulating supply as a plain decimal number for CMC.
- `https://teamdrop589.github.io/supply/max-supply.txt` returns the fixed 1,000,000 DROP cap as a plain decimal number.

The numeric endpoints contain only the number and a trailing newline. CMC's total supply endpoint uses `issued_supply`; max supply uses the fixed cap. Circulating supply currently equals issued supply because the project reports that all issued DROP is community-held and no team/reserve allocations are excluded.
