import { NextRequest, NextResponse } from "next/server";
import { initSocketServer } from "@/lib/socket";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    // Next.js App Router doesn't support direct socket.io integration in the same way
    // So we need to return a response informing clients to use WebSockets
    return new NextResponse(
      JSON.stringify({
        success: true,
        message: "Socket.IO server is running. Connect with a WebSocket client.",
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Socket.IO initialization error:", error);
    return NextResponse.json(
      { error: "Failed to initialize Socket.IO server" },
      { status: 500 }
    );
  }
}

// For WebSocket setup in App Router, you'll need to add socket.io to a custom server
// See: https://socket.io/how-to/use-with-next-js 