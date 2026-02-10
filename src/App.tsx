import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { MoodProvider } from "@/contexts/MoodContext";
import { SearchProvider } from "./contexts/SearchContext";
import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { LoadingScreen } from "./components/branding/LoadingScreen";
import Home from "./pages/Home";
import Search from "./pages/Search";
import MoodMatch from "./pages/MoodMatch";
import Watchlist from "./pages/Watchlist";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import MovieDetails from "./pages/MovieDetails";
import Movies from "./pages/Movies";
import TVSeries from "./pages/TVSeries";
import Groups from "./pages/Groups";
import Friends from "./pages/Friends";
import Auth from "./pages/Auth";
import WatchParty from "./pages/WatchParty";
import Watch from "./pages/Watch";
import NotFound from "./pages/NotFound";

const App = () => {
  const [queryClient] = useState(() => new QueryClient());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <MoodProvider>
          <AuthProvider>
            <SearchProvider>
              <BrowserRouter>
                <TooltipProvider>
                  <Toaster />
                  <Sonner position="top-center" />
                  
                  <AnimatePresence mode="wait">
                    {isLoading && <LoadingScreen key="loading" />}
                  </AnimatePresence>

                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/movies" element={<Movies />} />
                    <Route path="/tv-series" element={<TVSeries />} />
                    <Route path="/mood" element={<MoodMatch />} />
                    <Route path="/watchlist" element={<Watchlist />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/movie/:id" element={<MovieDetails />} />
                    <Route path="/tv/:id" element={<MovieDetails />} />
                    <Route path="/watch/:type/:id" element={<Watch />} />
                    <Route path="/groups" element={<Groups />} />
                    <Route path="/friends" element={<Friends />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/party" element={<WatchParty />} />
                    <Route path="/party/:roomId" element={<WatchParty />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </TooltipProvider>
              </BrowserRouter>
            </SearchProvider>
          </AuthProvider>
        </MoodProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
};

export default App;
