import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { BeyondMatchmaking } from "@/components/BeyondMatchmaking";
import { Testimonials } from "@/components/Testimonials";
import { HowItWorks } from "@/components/HowItWorks";
import { FeaturedTables } from "@/components/FeaturedTables";
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
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <BeyondMatchmaking />
        <Testimonials />
        <HowItWorks />
        <FeaturedTables />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
