import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing video id or url' }, { status: 400 });
  }

  // Linisin ang input ID para makuha lamang ang short ID code
  let cleanId = id;
  if (id.includes('/s/')) {
    cleanId = id.split('/s/')[1].split('?')[0].split('&')[0];
  } else if (id.includes('surl=')) {
    cleanId = id.split('surl=')[1].split('&')[0];
  }

  const finalShareUrl = `https://1024terabox.com/s/${cleanId}`;

  // LISTAHAN NG MGA MATATAG NA PUBLIC BYPASS APIs (Walang Cookie Setup na Kailangan!)
  const publicApis = [
    // 1. Terabox Proxy Public Server
    {
      url: `https://terabox-proxy.vercel.app/api/download?url=${encodeURIComponent(finalShareUrl)}`,
      parse: (data) => {
        const file = data.files && data.files[0];
        return file ? {
          download_link: file.download_link || file.direct_link,
          file_name: file.filename || file.file_name
        } : null;
      }
    },
    // 2. Terabox App Public Server
    {
      url: `https://terabox-app.vercel.app/api?url=${encodeURIComponent(finalShareUrl)}`,
      parse: (data) => {
        const file = data.files && data.files[0];
        return file ? {
          download_link: file.download_link || file.direct_link,
          file_name: file.filename || file.file_name
        } : null;
      }
    },
    // 3. Alternate Direct Server
    {
      url: `https://terashare.vercel.app/api?url=${encodeURIComponent(finalShareUrl)}`,
      parse: (data) => {
        return data.download ? {
          download_link: data.download,
          file_name: data.filename || "TeraBox_Video.mp4"
        } : null;
      }
    }
  ];

  // SUBUKAN ANG BAWAT API SA MAAYOS NA PAGKASUNOD-SUNOD
  for (const api of publicApis) {
    try {
      const response = await fetch(api.url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(6000) // 6-seconds timeout bawat API para mabilis lumipat sa susunod kung mabagal
      });

      if (response.ok) {
        const data = await response.json();
        const result = api.parse(data);

        if (result && result.download_link) {
          return NextResponse.json({
            ok: true,
            download_link: result.download_link,
            file_name: result.file_name
          });
        }
      }
    } catch (e) {
      console.log(`Failed to fetch from ${api.url}: ${e.message}`);
    }
  }

  return NextResponse.json({ 
    ok: false, 
    message: 'All public bypass APIs are currently busy or rate-limited. Please try again in a few seconds.' 
  });
}
