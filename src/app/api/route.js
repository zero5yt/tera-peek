import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing video id' }, { status: 400 });
  }

  try {
    // Tumawag sa gumaganang public Terabox extraction API
    const response = await fetch(`https://terabox-dl.site/api/extract?id=${id}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      }
    });

    const data = await response.json();

    if (data && data.download_link) {
      return NextResponse.json({
        ok: true,
        download_link: data.download_link,
        file_name: data.file_name || "TeraBox_Video.mp4"
      });
    }

    return NextResponse.json({ ok: false, message: 'Could not extract direct link' });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
