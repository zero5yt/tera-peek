import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing video id or url' }, { status: 400 });
  }

  let cleanId = id;
  if (id.includes('/s/')) {
    cleanId = id.split('/s/')[1].split('?')[0].split('&')[0];
  } else if (id.includes('surl=')) {
    cleanId = id.split('surl=')[1].split('&')[0];
  }

  const finalShareUrl = `https://www.terabox.com/s/${cleanId}`;

  // ------------------------------------------------------------
  // SOURCE 1: ANG SARILI MONG "TERABOX-DL" SA RENDER (PRIMARY)
  // Ito ang pinakamabilis at pinaka-stable dahil sa sarili mong account ito tumatakbo!
  // Dahil ito ay direct link, ibabalik natin ito nang DIREKTA (no proxy) para iwas 30-sec limit.
  // ------------------------------------------------------------
  try {
    const renderApiUrl = `https://terabox-dl-6bi7.onrender.com/api?url=${encodeURIComponent(finalShareUrl)}`;
    const renderRes = await fetch(renderApiUrl, { signal: AbortSignal.timeout(6000) });

    if (renderRes.ok) {
      const renderData = await renderRes.json();
      
      // I-extract ang 'download' direct link at metadata mula sa Render API response
      const rawDirectLink = renderData.download || renderData.url;
      const fileName = renderData.filename || "TeraBox_Video.mp4";

      if (rawDirectLink) {
        return NextResponse.json({
          ok: true,
          download_link: rawDirectLink, // Direct return para sa maximum speed sa mobile at Chrome!
          file_name: fileName
        });
      }
    }
  } catch (e) {
    console.log("Source 1 (Render API) failed or timed out: " + e.message);
  }

  // ------------------------------------------------------------
  // SOURCE A: TWO-STEP PUBLIC WORKER RESOLVER (FALLBACK)
  // ------------------------------------------------------------
  try {
    const infoRes = await fetch(`https://terabox.hnn.workers.dev/api/get-info?shorturl=${cleanId}&pwd=`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });

    if (infoRes.ok) {
      const infoData = await infoRes.json();
      const fsId = infoData.list && infoData.list[0] && infoData.list[0].fs_id;

      if (fsId) {
        const dlRes = await fetch(`https://terabox.hnn.workers.dev/api/get-download`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            shareid: infoData.shareid,
            uk: infoData.uk,
            sign: infoData.sign,
            timestamp: infoData.timestamp,
            fs_id: fsId
          }),
          signal: AbortSignal.timeout(3000)
        });

        if (dlRes.ok) {
          const dlData = await dlRes.json();
          const rawDirect = dlData.downloadLink || dlData.download_link || dlData.direct_link || dlData.download;

          if (rawDirect) {
            return NextResponse.json({
              ok: true,
              download_link: rawDirect,
              file_name: infoData.list[0].filename || "TeraBox_Video.mp4"
            });
          }
        }
      }
    }
  } catch (e) {
    console.log("Source A failed: " + e.message);
  }

  // ------------------------------------------------------------
  // SOURCE B: ALTERNATE APIS (FALLBACK)
  // ------------------------------------------------------------
  const apiSources = [
    `https://terabox-proxy.vercel.app/api/download?url=${encodeURIComponent(finalShareUrl)}`,
    `https://terabox-app.vercel.app/api?url=${encodeURIComponent(finalShareUrl)}`
  ];

  for (const apiUrl of apiSources) {
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        const data = await response.json();
        const fileList = data.files || data.list;
        const file = fileList && fileList[0];
        
        const rawDirectLink = file ? (file.download_link || file.direct_link || file.dlink) : null;
        const fileName = file ? (file.filename || file.file_name) : "TeraBox_Video.mp4";

        if (rawDirectLink) {
          return NextResponse.json({
            ok: true,
            download_link: rawDirectLink,
            file_name: fileName
          });
        }
      }
    } catch (e) {
      console.log(`Failed to fetch from B: ${apiUrl}`);
    }
  }

  // ------------------------------------------------------------
  // SOURCE C: TERABRIDGE FALLBACK (DIRECT UNPROXIED LINK)
  // ------------------------------------------------------------
  try {
    const terabridgeUrl = `https://terabridge.vercel.app/api/download?surl=${cleanId}`;
    return NextResponse.json({
      ok: true,
      download_link: terabridgeUrl,
      file_name: "TeraBox_Video_Stream.mp4"
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: 'All public bypass APIs are currently busy. Please try again in a few seconds.'
    });
  }
}
