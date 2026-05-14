import { useState, useRef, FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ExternalLink, TrendingUp, ChevronRight, Zap } from "lucide-react";
import { useSearchPrices, useGetPopularSearches, getSearchPricesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatPln(price: number) {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
  }).format(price);
}

export default function Home() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const q = searchParams.get("q") || "";
  
  const [inputValue, setInputValue] = useState(q);
  const [hasSearched, setHasSearched] = useState(!!q);

  const { data: popularSearches = [], isLoading: isLoadingPopular } = useGetPopularSearches();
  const { data: searchResults, isLoading: isSearching } = useSearchPrices(
    { q },
    { query: { enabled: !!q && hasSearched, queryKey: getSearchPricesQueryKey({ q }) } }
  );

  const handleSearch = (e?: FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;
    setHasSearched(true);
    setLocation(`/?q=${encodeURIComponent(inputValue.trim())}`);
  };

  const handlePopularClick = (query: string) => {
    setInputValue(query);
    setHasSearched(true);
    setLocation(`/?q=${encodeURIComponent(query)}`);
  };

  const sortedResults = searchResults ? [...searchResults].sort((a, b) => a.price - b.price) : [];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" onClick={() => { setInputValue(""); setHasSearched(false); setLocation("/"); }} className="flex items-center gap-2 flex-shrink-0 group cursor-pointer">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">TanioSzukaj</span>
          </Link>
          
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative flex items-center">
            <Search className="absolute left-3.5 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Czego szukasz? (np. iPhone 15, kawa lavazza)" 
              className="pl-11 pr-24 h-12 text-base rounded-full border-border/80 bg-muted/40 focus-visible:bg-background focus-visible:ring-primary/50 shadow-sm"
            />
            <Button 
              type="submit" 
              size="sm" 
              className="absolute right-1.5 h-9 rounded-full px-4 font-medium"
              disabled={!inputValue.trim()}
            >
              Szukaj
            </Button>
          </form>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col">
        {!hasSearched ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 md:py-24 text-center max-w-2xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-8 text-primary ring-1 ring-primary/20 shadow-xl shadow-primary/5">
                <Zap className="w-10 h-10 fill-current" />
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
                Najtańsze oferty. <span className="text-primary">W sekundę.</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-12">
                Przeszukujemy polskie i zagraniczne sklepy, żeby znaleźć najlepszą cenę na to, czego właśnie potrzebujesz.
              </p>
              
              <div className="space-y-4 w-full">
                <div className="flex items-center gap-2 justify-center text-sm font-medium text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <span>Popularne wyszukiwania</span>
                </div>
                
                <div className="flex flex-wrap gap-2 justify-center">
                  {isLoadingPopular ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-9 w-24 rounded-full" />
                    ))
                  ) : (
                    popularSearches.map((item) => (
                      <Button
                        key={item.query}
                        variant="secondary"
                        className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors hover:border-primary/20 border border-transparent"
                        onClick={() => handlePopularClick(item.query)}
                      >
                        {item.query}
                      </Button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">
                {isSearching ? "Szukam najlepszych cen..." : `Wyniki dla "${q}"`}
              </h2>
              {!isSearching && searchResults && (
                <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  Znaleziono {searchResults.length} ofert
                </span>
              )}
            </div>

            {isSearching ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-4 flex items-center gap-4">
                    <Skeleton className="w-16 h-16 rounded-md flex-shrink-0" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-5 w-1/3" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                    <div className="w-32 flex flex-col items-end gap-2">
                      <Skeleton className="h-7 w-20" />
                      <Skeleton className="h-10 w-full rounded-md" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : sortedResults.length > 0 ? (
              <div className="space-y-4">
                <AnimatePresence>
                  {sortedResults.map((result, index) => {
                    const isWinner = index === 0;
                    return (
                      <motion.div
                        key={`${result.store}-${result.url}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <Card className={`overflow-hidden transition-all duration-200 hover:shadow-md ${isWinner ? 'border-primary ring-1 ring-primary/20 shadow-sm' : 'border-border/50 hover:border-border'}`}>
                          <div className={`p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 ${isWinner ? 'bg-primary/5' : ''}`}>
                            
                            <div className="flex-1 flex gap-4 min-w-0 w-full">
                              <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-white rounded-lg border flex items-center justify-center overflow-hidden">
                                {result.imageUrl ? (
                                  <img src={result.imageUrl} alt={result.title} className="w-full h-full object-contain p-2" />
                                ) : (
                                  <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                                    <Search className="w-6 h-6 opacity-20" />
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-1.5">
                                  {result.favicon && (
                                    <img src={result.favicon} alt="" className="w-4 h-4 rounded-sm" />
                                  )}
                                  <span className="text-sm font-semibold text-muted-foreground">{result.store}</span>
                                  {isWinner && (
                                    <Badge className="bg-primary text-primary-foreground text-[10px] uppercase tracking-wider px-2 py-0.5 ml-2">
                                      Najtaniej
                                    </Badge>
                                  )}
                                </div>
                                <h3 className="text-base sm:text-lg font-medium leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                                  {result.title}
                                </h3>
                              </div>
                            </div>

                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto gap-4 sm:gap-3 border-t sm:border-t-0 pt-4 sm:pt-0 mt-2 sm:mt-0">
                              <div className="flex flex-col items-start sm:items-end">
                                <div className={`text-xl sm:text-2xl font-bold tracking-tight ${isWinner ? 'text-primary' : 'text-foreground'}`}>
                                  {formatPln(result.price)}
                                </div>
                                {result.priceText && result.priceText !== formatPln(result.price) && (
                                  <div className="text-xs text-muted-foreground line-through">
                                    {result.priceText}
                                  </div>
                                )}
                              </div>
                              <Button 
                                asChild 
                                size={isWinner ? "default" : "sm"}
                                variant={isWinner ? "default" : "outline"}
                                className={`w-full sm:w-auto font-semibold ${isWinner ? 'shadow-md shadow-primary/20' : ''}`}
                              >
                                <a href={result.url} target="_blank" rel="noopener noreferrer">
                                  Kup teraz <ExternalLink className="w-4 h-4 ml-2" />
                                </a>
                              </Button>
                            </div>
                            
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">Brak wyników</h3>
                <p className="text-muted-foreground max-w-md mb-8">
                  Nie znaleźliśmy ofert dla "{q}". Spróbuj wpisać inną nazwę produktu lub sprawdź nasze najpopularniejsze wyszukiwania.
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {popularSearches.slice(0, 4).map((item) => (
                    <Button
                      key={item.query}
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => handlePopularClick(item.query)}
                    >
                      {item.query}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
