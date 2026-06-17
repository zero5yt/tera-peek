import { NextResponse } from 'next/server';

export const runtime = 'edge'; 

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  const headers = new Headers();
  
  // Ipasa ang Range header para gumana ang pag-drag/seek sa player ng mobile app mo
  const range = request.headers.get('Range');
  if (range) {
    headers.set('Range', range);
  }

  headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  headers.set('Referer', 'https://www.terabox.com/');

  try {
    const response = await fetch(targetUrl, {
      headers: headers,
      redirect: 'follow'
    });

    const newHeaders = new Headers(response.headers);
    
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Headers', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  } catch (e) {
    return new Response('Proxy Error: ' + e.message, { status: 500 });
  }
}
