// Worker mínimo que roda na borda do Cloudflare, na frente do site estático.
//
// Praticamente toda requisição só é repassada direto pros arquivos do site
// (env.ASSETS.fetch) — o site continua um SPA normal em React. A única
// exceção é a URL de um anúncio específico (/veiculo/<id>): antes de
// devolver a página, este Worker busca aquele veículo no Supabase e troca as
// tags <title>/<meta> do HTML pelas informações reais dele (foto, preço,
// descrição). É isso que faz o link aparecer com a prévia certa quando
// alguém cola no WhatsApp/Instagram/Facebook — esses apps não executam
// JavaScript, então só enxergam o que já vem pronto no HTML.
//
// Precisa que as mesmas duas variáveis do Supabase (VITE_SUPABASE_URL e
// VITE_SUPABASE_ANON_KEY) também estejam cadastradas como "Environment
// Variables" (variáveis de runtime do Worker) nas configurações do projeto
// no Cloudflare — além das "Build variables" que já existem pra compilação.
// São as mesmas duas, só cadastradas de novo em outro lugar do painel.

const VEHICLE_PATH = /^\/veiculo\/([0-9a-fA-F-]{36})\/?$/;

function escapeAttr(value) {
  return String(value).replace(/"/g, "&quot;");
}

function buildMeta(vehicle, pageUrl, siteOrigin) {
  const price = `R$ ${Number(vehicle.price).toLocaleString("pt-BR")}`;
  const title = `${vehicle.brand} ${vehicle.model} ${vehicle.year} — ${price} | Five Garage`;
  const description =
    vehicle.description && vehicle.description.trim()
      ? vehicle.description.trim().slice(0, 160)
      : `${vehicle.brand} ${vehicle.model} ${vehicle.year}${
          vehicle.mileage ? ", " + Number(vehicle.mileage).toLocaleString("pt-BR") + " km" : ""
        } — à venda na Five Garage. Fale pelo WhatsApp.`;
  const image = vehicle.image_url || `${siteOrigin}/logo-full.jpg`;
  return { title, description, image, pageUrl };
}

// Cabeçalho de depuração (x-debug-worker) adicionado em toda resposta desta
// rota, só pra facilitar diagnosticar problemas olhando a aba Network do
// navegador — pode ser removido depois que tudo estiver funcionando.
function withDebug(response, reason) {
  const headers = new Headers(response.headers);
  headers.set("x-debug-worker", reason);
  // Essa rota decide o conteúdo (e às vezes dá erro) dependendo do que
  // acontece a cada requisição (Supabase no ar, veículo existe, chave
  // válida etc.) — nunca pode ficar guardada em cache de borda do
  // Cloudflare, senão um erro temporário (ou os dados de um veículo)
  // ficam "congelados" e continuam sendo servidos depois de já terem sido
  // corrigidos/atualizados.
  headers.set("cache-control", "no-store");
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(VEHICLE_PATH);

    if (!match) {
      const res = await env.ASSETS.fetch(request);
      return withDebug(res, "no-path-match");
    }

    const vehicleId = match[1];
    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      const res = await env.ASSETS.fetch(request);
      return withDebug(res, "no-env-vars");
    }

    let vehicle = null;
    let fetchDebug = "ok";
    try {
      const apiRes = await fetch(
        `${supabaseUrl}/rest/v1/vehicles?id=eq.${vehicleId}&select=*`,
        { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` } }
      );
      if (apiRes.ok) {
        const rows = await apiRes.json();
        vehicle = Array.isArray(rows) ? rows[0] : null;
        if (!vehicle) fetchDebug = "no-vehicle-row";
      } else {
        fetchDebug = `http-${apiRes.status}:${(await apiRes.text()).slice(0, 200)}`;
      }
    } catch (e) {
      fetchDebug = `throw:${String(e && e.message ? e.message : e).slice(0, 200)}`;
    }

    const indexRequest = new Request(new URL("/", request.url), request);
    const assetResponse = await env.ASSETS.fetch(indexRequest);

    if (!vehicle) {
      return withDebug(assetResponse, fetchDebug);
    }

    const { title, description, image, pageUrl } = buildMeta(
      vehicle,
      `${url.origin}/veiculo/${vehicle.id}`,
      url.origin
    );

    let html = await assetResponse.text();

    html = html
      .replace(/<title>.*?<\/title>/s, `<title>${escapeAttr(title)}</title>`)
      .replace(
        /<meta\s+name="description"\s+content=".*?"\s*\/?>/s,
        `<meta name="description" content="${escapeAttr(description)}" />`
      )
      .replace(
        /<meta\s+property="og:title"\s+content=".*?"\s*\/?>/s,
        `<meta property="og:title" content="${escapeAttr(title)}" />`
      )
      .replace(
        /<meta\s+property="og:description"\s+content=".*?"\s*\/?>/s,
        `<meta property="og:description" content="${escapeAttr(description)}" />`
      )
      .replace(
        /<meta\s+property="og:image"\s+content=".*?"\s*\/?>/s,
        `<meta property="og:image" content="${escapeAttr(image)}" />`
      )
      .replace(
        /<meta\s+property="og:type"\s+content=".*?"\s*\/?>/s,
        `<meta property="og:type" content="product" /><meta property="og:url" content="${escapeAttr(pageUrl)}" /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:image" content="${escapeAttr(image)}" />`
      );

    return new Response(html, {
      status: assetResponse.status,
      headers: {
        "content-type": "text/html; charset=UTF-8",
        "x-debug-worker": "replaced",
        "cache-control": "no-store",
      },
    });
  },
};