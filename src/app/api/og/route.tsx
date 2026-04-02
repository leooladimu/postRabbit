import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#faf3e8',
        }}
      >
        <img
          src="https://postrabbit.oleo.dev/postRabbit.png"
          alt="postRabbit"
          width="700"
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
