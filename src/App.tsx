import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/hooks/useCart";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import DashboardShell, { vendorNav, adminNav, clientNav, courierNav, moderatorNav } from "./components/DashboardShell";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Shops from "./pages/Shops";
import ShopDetail from "./pages/ShopDetail";
import ProductDetail from "./pages/ProductDetail";
import ShopOnboarding from "./pages/ShopOnboarding";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import VendorOverview from "./pages/dashboard/VendorOverview";
import VendorSales from "./pages/dashboard/VendorSales";
import AdminOverview from "./pages/dashboard/AdminOverview";
import ProductsList from "./pages/dashboard/ProductsList";
import NewProduct from "./pages/dashboard/NewProduct";
import MyShop from "./pages/dashboard/MyShop";
import AdminShops from "./pages/dashboard/AdminShops";
import AdminUsers from "./pages/dashboard/AdminUsers";
import AdminFinance from "./pages/dashboard/AdminFinance";
import AdminOrders from "./pages/dashboard/AdminOrders";
import ClientOverview from "./pages/dashboard/ClientOverview";
import ClientProfile from "./pages/dashboard/ClientProfile";
import CourierDeliveries from "./pages/dashboard/CourierDeliveries";
import CourierApplications from "./pages/dashboard/CourierApplications";
import AdminTeam from "./pages/dashboard/AdminTeam";
import About from "./pages/About";
import Services from "./pages/Services";
import Conditions from "./pages/Conditions";
import CGU from "./pages/CGU";
import CGV from "./pages/CGV";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import SupportChatWidget from "./components/SupportChatWidget";

const queryClient = new QueryClient();

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      <SiteFooter />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CartProvider>
          <Routes>
            <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
            <Route path="/shops" element={<PublicLayout><Shops /></PublicLayout>} />
            <Route path="/shop/:slug" element={<PublicLayout><ShopDetail /></PublicLayout>} />
            <Route path="/product/:id" element={<PublicLayout><ProductDetail /></PublicLayout>} />
            <Route path="/cart" element={<PublicLayout><Cart /></PublicLayout>} />
            <Route path="/checkout" element={<PublicLayout><Checkout /></PublicLayout>} />
            <Route path="/orders" element={<PublicLayout><Orders /></PublicLayout>} />
            <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
            <Route path="/services" element={<PublicLayout><Services /></PublicLayout>} />
            <Route path="/conditions" element={<PublicLayout><Conditions /></PublicLayout>} />
            <Route path="/auth" element={<><SiteHeader /><Auth /></>} />
            <Route path="/onboarding/shop" element={<PublicLayout><ShopOnboarding /></PublicLayout>} />

            <Route path="/account" element={<><SiteHeader /><DashboardShell items={clientNav} title="Mon compte" /></>}>
              <Route index element={<ClientOverview />} />
              <Route path="profile" element={<ClientProfile />} />
              <Route path="cart" element={<Cart />} />
              <Route path="orders" element={<Orders />} />
            </Route>

            <Route path="/vendor" element={<><SiteHeader /><DashboardShell items={vendorNav} title="Vendeur" /></>}>
              <Route index element={<VendorOverview />} />
              <Route path="products" element={<ProductsList scope="vendor" />} />
              <Route path="products/new" element={<NewProduct mode="vendor" />} />
              <Route path="sales" element={<VendorSales />} />
              <Route path="shop" element={<MyShop />} />
            </Route>

            <Route path="/courier" element={<><SiteHeader /><DashboardShell items={courierNav} title="Livreur" /></>}>
              <Route index element={<CourierDeliveries />} />
            </Route>

            <Route path="/admin" element={<><SiteHeader /><DashboardShell items={adminNav} title="Admin" /></>}>
              <Route index element={<AdminOverview />} />
              <Route path="products" element={<ProductsList scope="admin" />} />
              <Route path="products/new" element={<NewProduct mode="admin" />} />
              <Route path="shops" element={<AdminShops />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="finance" element={<AdminFinance />} />
              <Route path="couriers" element={<CourierApplications />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="team" element={<AdminTeam />} />
            </Route>

            <Route path="/moderator" element={<><SiteHeader /><DashboardShell items={moderatorNav} title="Modérateur" /></>}>
              <Route index element={<AdminOrders />} />
              <Route path="shops" element={<AdminShops />} />
              <Route path="couriers" element={<CourierApplications />} />
              <Route path="users" element={<AdminUsers />} />
            </Route>

            <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
          </Routes>
          <SupportChatWidget />
        </CartProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
