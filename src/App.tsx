import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import { AuthGate } from './components/auth/AuthGate';
import { AppLayout } from './components/layout/AppLayout';

import { SettingsPage } from './features/settings/SettingsPage';
import { CustomerList } from './features/customers/CustomerList';
import { OrdersPage } from './features/orders/OrdersPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { InventoryPage } from './features/inventory/InventoryPage';
import { ReportsPage } from './features/reports/ReportsPage';

// Customers & Settings moved to real file


const queryClient = new QueryClient();

function App() {
    return (
        <ConfigProvider locale={esES}>
            <QueryClientProvider client={queryClient}>
                <AuthGate>
                    <BrowserRouter>
                        <Routes>
                            <Route path="/" element={<AppLayout />}>
                                <Route index element={<DashboardPage />} />
                                <Route path="customers" element={<CustomerList />} />
                                <Route path="orders" element={<OrdersPage />} />
                                <Route path="reports" element={<ReportsPage />} />
                                <Route path="inventory" element={<InventoryPage />} />
                                <Route path="settings" element={<SettingsPage />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Route>
                        </Routes>
                    </BrowserRouter>
                </AuthGate>
            </QueryClientProvider>
        </ConfigProvider>
    );
}

export default App;
