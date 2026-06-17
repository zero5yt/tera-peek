import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing video id' }, { status: 400 });
  }

  try {
    // Gagamit tayo ng active, fast, at official public bypass server ng TeraPeek
    const targetUrl = `https://tera-core.vercel.app/api2?url=https://1024terabox.com/s/${id}`;

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      // 10-second timeout control para maiwasan ang tuluyang pagka-hang ng vercel
      signal: AbortSignal.timeout(10000) 
    });

    if (!response.ok) {
      return NextResponse.json({ ok: false, error: `Upstream error: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();

    // Kukuhanin natin ang unang file sa ibinalik na listahan ng terabox-gateway
    const file = data.list && data.list[0];
    const directLink = file ? (file.direct_link || file.dlink || file.download_link) : null;
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
