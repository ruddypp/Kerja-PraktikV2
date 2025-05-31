interface DashboardStats {
  totalItems: number;
  statusCounts: Record<string, number>;
  statusMap: Record<string, number>;
}

export async function getDashboardStats(): Promise<DashboardStats | null> {
  try {
    // For server components in Next.js, we need to use absolute URL
    const url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${url}/api/admin/dashboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Ensure we get fresh data each time
      cache: 'no-store',
      // For server components, this is important
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      console.error(`Failed to fetch dashboard stats: ${response.status} ${response.statusText}`);
      throw new Error('Failed to fetch dashboard stats');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      totalItems: 0,
      statusCounts: {},
      statusMap: {}
    };
  }
} 