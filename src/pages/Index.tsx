import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { FeaturedTables } from "@/components/FeaturedTables";
import { MestresDestaque } from "@/components/home/MestresDestaque";
import { CronicasNewsletter } from "@/components/home/CronicasNewsletter";
import { BeyondMatchmaking } from "@/components/BeyondMatchmaking";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] font-editorial text-zinc-100">
      <Header />
      <main>
        <Hero />
        <FeaturedTables />
        <MestresDestaque />
        <BeyondMatchmaking />
        <CronicasNewsletter />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
