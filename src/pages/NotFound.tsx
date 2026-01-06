import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Film, Home, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-[100px] opacity-50" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/20 rounded-full blur-[100px] opacity-50" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center space-y-6 max-w-md"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="inline-flex items-center justify-center h-24 w-24 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 border border-border mx-auto"
        >
          <Film className="h-12 w-12 text-primary" />
        </motion.div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-6xl font-bold gradient-text">404</h1>
          <h2 className="text-xl font-semibold text-foreground">Scene Not Found</h2>
          <p className="text-muted-foreground">
            Looks like this movie hasn't been released yet. Let's get you back to the main feature!
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate(-1)} variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <Button onClick={() => navigate("/")} className="gap-2">
            <Home className="h-4 w-4" />
            Home
          </Button>
          <Button onClick={() => navigate("/search")} variant="outline" className="gap-2">
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
