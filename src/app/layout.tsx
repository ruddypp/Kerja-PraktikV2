import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { UserProvider } from "./context/UserContext";
import { NotificationProvider } from "./context/NotificationContext";
import { Providers } from "./providers";
import ToastContainer from "@/components/ui/ToastContainer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Paramata Inventory Management System",
  description: "Paramata Inventory Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <UserProvider>
            <NotificationProvider>
            {children}
              <ToastContainer />
            </NotificationProvider>
          </UserProvider>
        </Providers>
        
        {/* Script to set up required statuses */}
        <Script id="setup-statuses">
          {`
            // Set up required statuses once when the app loads
            (async function setupStatuses() {
              try {
                await fetch('/api/admin/setup-statuses');
                console.log('Status setup check completed');
              } catch (e) {
                console.error('Status setup error:', e);
              }
            })();
          `}
        </Script>

        {/* Script to register service worker for push notifications */}
        <Script id="register-sw">
          {`
            // Register service worker for push notifications
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  })
                  .catch(function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
