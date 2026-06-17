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

  // Awtomatikong gagamitin ang sarili mong Vercel Domain para sa video proxy streaming
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const PROXY_BASE = `${protocol}://${host}/api/proxy?url=`;

  // ------------------------------------------------------------
  // SOURCE A: TWO-STEP PUBLIC WORKER RESOLVER (FALLBACK)
  // ------------------------------------------------------------
  try {
    const infoRes = await fetch(`https://terabox.hnn.workers.dev/api/get-info?shorturl=${cleanId}&pwd=`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000) // Maikling timeout para mabilis lumaktaw kapag mabagal
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
              download_link: `${PROXY_BASE}${encodeURIComponent(rawDirect)}`,
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
            download_link: `${PROXY_BASE}${encodeURIComponent(rawDirectLink)}`,
            file_name: fileName
          });
        }
      }
    } catch (e) {
      console.log(`Failed to fetch from B: ${apiUrl}`);
    }
  }

  // ------------------------------------------------------------
  // SOURCE C: TERABRIDGE FALLBACK (PROXIED - INSTANT RETURN)
  // Dahil ito ay nagre-redirect sa video file, ibabalik natin ito agad
  // papunta sa iyong sariling Vercel Proxy nang walang server delays!
  // ------------------------------------------------------------
  try {
    const terabridgeUrl = `https://terabridge.vercel.app/api/download?surl=${cleanId}`;
    return NextResponse.json({
      ok: true,
      download_link: `${PROXY_BASE}${encodeURIComponent(terabridgeUrl)}`,
      file_name: "TeraBox_Video_Stream.mp4"
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: 'All public bypass APIs are currently busy. Please try again in a few seconds.'
    });
  }
}
