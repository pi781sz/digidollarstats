// Cloudflare Pages Function → serves live DigiDollar stats as JSON at /supply.json
// Fetches from the public digibyte.io API and re-serves in a clean, machine-readable shape.
// This exists so AI crawlers and other tools that don't run JavaScript can still read
// the real, current numbers. Data is live; nothing here is simulated.

const SOURCE = 'https://digibyte.io/api/getdigidollarstats';

export async function onRequest(context) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=60',      // 1-minute edge cache
    'Content-Type': 'application/json; charset=utf-8'
  };

  try {
    const res = await fetch(SOURCE, { cf: { cacheTtl: 60 } });
    if (!res.ok) throw new Error('source returned ' + res.status);
    const d = await res.json();

    const out = {
      asset: 'DigiDollar',
      ticker: 'DD',
      chain: 'DigiByte',
      network: 'mainnet',
      status: 'live',
      circulating_supply_usd: (d.total_dd_supply || 0) / 100,   // supply is stored in cents
      circulating_supply_dd: (d.total_dd_supply || 0) / 100,
      dgb_locked_as_collateral: d.total_collateral_dgb || 0,
      active_positions: d.active_positions || 0,
      system_collateral_ratio_pct: d.system_collateral_ratio ?? d.health_percentage ?? null,
      system_health: d.health_status || null,
      minting_open: !d.minting_restricted_reason || d.minting_restricted_reason === 'none',
      emergency_mode: !!d.is_emergency,
      oracle_price_usd_per_dgb: d.oracle_price_micro_usd ? d.oracle_price_micro_usd / 1e6 : null,
      oracle_available: !!d.oracle_available,
      source: 'digibyte.io public API',
      note: 'Independent community project. Not an official DigiByte channel. Not financial advice.',
      updated_at: new Date().toISOString()
    };

    return new Response(JSON.stringify(out, null, 2), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({
      status: 'error',
      message: 'Live data source is temporarily unreachable. No cached or simulated values are served.',
      source: 'digibyte.io public API',
      updated_at: new Date().toISOString()
    }, null, 2), { status: 503, headers: cors });
  }
}
