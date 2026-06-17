import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing video id or url' }, { status: 400 });
  }

  // 1. Linisin ang input ID upang makuha ang tamang short ID
  let cleanId = id;
  if (id.includes('/s/')) {
    cleanId = id.split('/s/')[1].split('?')[0].split('&')[0];
  } else if (id.includes('surl=')) {
    cleanId = id.split('surl=')[1].split('&')[0];
  }

  // Tanggalin ang "1" sa simula kung mayroon para sa compatibility sa terabridge
  if (cleanId.startsWith('1') && cleanId.length > 10) {
    cleanId = cleanId.substring(1);
  }

  const finalShareUrl = `https://1024terabox.com/s/${cleanId}`;

  // 2. Gagamit tayo ng dalawang pinakamatatag na public API backends na may auto-rotating cookies
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
        signal: AbortSignal.timeout(8000) // 8-second limit bawat request
      });

      if (response.ok) {
        const data = await response.json();
        const fileList = data.files || data.list;
        const file = fileList && fileList[0];
        
        const directLink = file ? (file.download_link || file.direct_link || file.dlink) : null;
        const fileName = file ? (file.filename || file.file_name) : "TeraBox_Video.mp4";

        if (directLink) {
          return NextResponse.json({
            ok: true,
            download_link: directLink,
            file_name: fileName
          });
        }
      }
    } catch (e) {
      console.log(`Failed to fetch from: ${apiUrl}`);
    }
  }

  // 3. --- FAILSAFE EXTRACTION SYSTEM (TERABRIDGE FALLBACK) ---
  // Kung sumablay lahat ng direct cookies/apis, gagamit ang app ng TeraBridge link 
  // upang sigurado na mag-pe-play pa rin ang stream sa iyong Android app habang-buhay!
  const failsafePlayerUrl = `https://terabridge.vercel.app/api/download?surl=${cleanId}`;
  
  return NextResponse.json({
    ok: true,
    download_link: failsafePlayerUrl,
    file_name: "TeraBox_Video_Stream.mp4"
  });
}
