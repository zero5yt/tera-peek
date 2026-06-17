import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing video id or url' }, { status: 400 });
  }

  try {
    let finalShareUrl = id;

    // SMART DETECTION: Kung hindi nagsisimula sa http, ibig sabihin ay short ID lang ang ipinasa (galing sa Android app)
    if (!id.startsWith('http://') && !id.startsWith('https://')) {
      finalShareUrl = `https://1024terabox.com/s/${id}`;
    }

    // NAKATURO NA SA BAGO MONG 'terabox-gateway1' DOMAIN
    const targetUrl = `https://terabox-gateway1.vercel.app/api2?url=${encodeURIComponent(finalShareUrl)}`;

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000) 
    });

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: `Upstream error: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();

    // SMART PARSING: Babasahin nito kung 'files' o 'list' ang ibinalik ng iyong gateway
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

    return NextResponse.json({ ok: false, message: 'Direct download link not found in upstream response' });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
