import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { FooterPublico } from "@/components/FooterPublico";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-muted">
      <div className="flex-1 flex items-center justify-center px-4 text-center">
        <div>
          <h1 className="mb-4 text-4xl font-bold">404</h1>
          <p className="mb-4 text-xl text-muted-foreground">Página não encontrada</p>
          <a href="/login" className="text-primary underline hover:text-primary/90">
            Voltar para o login
          </a>
        </div>
      </div>
      <FooterPublico showCompany />
    </div>
  );
};

export default NotFound;
