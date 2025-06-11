'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { useUser } from '@/app/context/UserContext';
import { 
  MdNotifications, 
  MdPerson, 
  MdLock, 
  MdSecurity,
  MdLanguage, 
  MdColorLens, 
  MdHelpOutline,
  MdAdminPanelSettings 
} from 'react-icons/md';

export default function SettingsPage() {
  const { user } = useUser();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Pengaturan</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pengaturan Notifikasi */}
          <Link 
            href="/notifications/preferences" 
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center mb-4">
              <div className="bg-green-100 p-3 rounded-lg mr-4">
                <MdNotifications className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Notifikasi</h2>
            </div>
            <p className="text-gray-600 text-sm">
              Atur preferensi pemberitahuan, frekuensi, dan saluran pengiriman.
            </p>
          </Link>
          
          {/* Pengaturan Profil */}
          <Link 
            href="/settings/profile" 
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <MdPerson className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Profil</h2>
            </div>
            <p className="text-gray-600 text-sm">
              Ubah informasi profil, nama, dan kontak.
            </p>
          </Link>
          
          {/* Pengaturan Keamanan */}
          <Link 
            href="/settings/security" 
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center mb-4">
              <div className="bg-red-100 p-3 rounded-lg mr-4">
                <MdLock className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Keamanan</h2>
            </div>
            <p className="text-gray-600 text-sm">
              Ubah kata sandi dan atur autentikasi.
            </p>
          </Link>
          
          {/* Pengaturan Bahasa */}
          <Link 
            href="/settings/language" 
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 p-3 rounded-lg mr-4">
                <MdLanguage className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Bahasa</h2>
            </div>
            <p className="text-gray-600 text-sm">
              Ubah bahasa antarmuka pengguna.
            </p>
          </Link>
          
          {/* Pengaturan Tema */}
          <Link 
            href="/settings/theme" 
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center mb-4">
              <div className="bg-yellow-100 p-3 rounded-lg mr-4">
                <MdColorLens className="h-6 w-6 text-yellow-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Tampilan</h2>
            </div>
            <p className="text-gray-600 text-sm">
              Atur tema dan preferensi tampilan.
            </p>
          </Link>
          
          {/* Bantuan dan Dukungan */}
          <Link 
            href="/settings/help" 
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center mb-4">
              <div className="bg-gray-100 p-3 rounded-lg mr-4">
                <MdHelpOutline className="h-6 w-6 text-gray-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Bantuan</h2>
            </div>
            <p className="text-gray-600 text-sm">
              Dapatkan bantuan atau laporkan masalah.
            </p>
          </Link>
          
          {/* Admin Panel - Hanya muncul untuk admin */}
          {isAdmin && (
            <Link 
              href="/admin/notifications" 
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center mb-4">
                <div className="bg-indigo-100 p-3 rounded-lg mr-4">
                  <MdAdminPanelSettings className="h-6 w-6 text-indigo-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Admin Notifikasi</h2>
              </div>
              <p className="text-gray-600 text-sm">
                Kelola notifikasi sistem dan pantau analitik penggunaan.
              </p>
            </Link>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}