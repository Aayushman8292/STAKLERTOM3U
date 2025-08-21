addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const { searchParams } = new URL(request.url);
  const channelNo = searchParams.get('id') || '';
  const playlist = searchParams.get('playlist') || '';


  const domainName = 'tv.fusion4k.cc';
  const macAddress = '00:1A:79:77:00:9C';
  const portalAddress = `http://${domainName}`;
  const referer = `${portalAddress}/stalker_portal/c/`;
  const host = domainName;
  const snumber = '204F6D53BttF9A498CE';
  const deviceID = 'C18303143CE1361B8959F48AB3491969859177F571C7CDD08F5398F0365FA2FC';
  const timezone = 'Europe%2FParis';

  const ipAddress = `49.244.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;

  const commonHeaders = {
    'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
    'X-User-Agent': 'Model: MAG250; Link: WiFi',
    'Accept': '*/*',
    'Referer': referer,
    'Host': host,
    'Connection': 'Keep-Alive',
    'Cookie': `mac=${macAddress}; stb_lang=en; timezone=${timezone}`,
    'X-Forwarded-For': ipAddress
  };

  try {
    // 1. Handshake
    const handshakeUrl = `${portalAddress}/stalker_portal/server/load.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml`;
    const handshakeResponse = await fetch(handshakeUrl, { headers: new Headers(commonHeaders) });
    const handshakeJson = await handshakeResponse.json();
    const token = handshakeJson?.js?.token;

    if (!token) {
      return new Response("Failed to get token", { status: 500 });
    }

    // 2. Get profile (optional)
    const timestamp = Math.floor(Date.now() / 1000);
    const getProfileUrl = `${portalAddress}/stalker_portal/server/load.php?type=stb&action=get_profile&hd=1&sn=${snumber}&device_id=${deviceID}&device_id2=${deviceID}&auth_second_step=1&client_type=STB&timestamp=${timestamp}&JsHttpRequest=1-xml`;

    const authHeaders = new Headers({
      ...commonHeaders,
      'Authorization': `Bearer ${token}`
    });

    await fetch(getProfileUrl, { headers: authHeaders });

    // 3. Handle playlist
    if (playlist === '1') {
      const channelsResp = await fetch(`${portalAddress}/stalker_portal/server/load.php?type=itv&action=get_all_channels&JsHttpRequest=1-xml`, { headers: authHeaders });
      const channelsJson = await channelsResp.json();
      const channels = channelsJson?.js?.data || [];

      const genresResp = await fetch(`${portalAddress}/stalker_portal/server/load.php?type=itv&action=get_genres&JsHttpRequest=1-xml`, { headers: authHeaders });
      const genresJson = await genresResp.json();
      const genres = genresJson?.js || [];

      const genreMap = {};
      for (const genre of genres) {
        genreMap[genre.id] = genre.title;
      }

      const baseDomain = request.headers.get('host');
      let m3uContent = `#EXTM3U\n`;5
      for (const ch of channels) {
        const id = ch.cmd.replace('ffrt http://localhost/ch/', '');
        const logoUrl = `${portalAddress}/misc/logos/320/${ch.logo}`;
        const group = genreMap[ch.tv_genre_id] || 'No Group';
        m3uContent += `#EXTINF:-1 tvg-id="${ch.xmltv_id}" tvg-logo="${logoUrl}" group-title="${group}", ${ch.name}\n`;
        m3uContent += `https://${baseDomain}/?id=${id}\n`;
      }

      return new Response(m3uContent, {
        headers: {
          'Content-Type': 'audio/x-mpegurl'
        }
      });
    }

    // 4. Handle single stream
    if (!channelNo) {
      return new Response("Missing channel ID", { status: 400 });
    }

    const createLinkUrl = `${portalAddress}/stalker_portal/server/load.php?type=itv&action=create_link&forced_storage=undefined&download=0&cmd=ffrt+http%3A%2F%2Flocalhost%2Fch%2F${channelNo}`;
    const linkResp = await fetch(createLinkUrl, { headers: authHeaders });
    const linkJson = await linkResp.json();
    const streamUrl = linkJson?.js?.cmd;

    if (!streamUrl) {
      return new Response("Stream link not found", { status: 500 });
    }

    return Response.redirect(streamUrl, 302);
  } catch (err) {
    return new Response(`Unexpected Error: ${err.message || err}`, { status: 500 });
  }
}
