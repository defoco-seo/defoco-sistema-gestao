"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, Users, Palette, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SearchResult {
  proposals: any[];
  clients: any[];
  jobs: any[];
}

export function GlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.results);
        }
      } catch (error) {
        console.error('Erro na busca:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = (type: string, id: string) => {
    setIsOpen(false);
    setQuery('');
    
    switch (type) {
      case 'proposal':
        router.push(`/dashboard/propostas/${id}`);
        break;
      case 'client':
        router.push(`/dashboard/crm?client=${id}`);
        break;
      case 'job':
        router.push(`/dashboard/criativo?job=${id}`);
        break;
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    lead: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    briefing: 'bg-purple-100 text-purple-800',
    creation: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
  };

  const hasResults = results && (
    results.proposals.length > 0 ||
    results.clients.length > 0 ||
    results.jobs.length > 0
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Search Trigger */}
      <Button
        variant="outline"
        className="w-[200px] md:w-[280px] justify-start text-gray-500 hover:text-gray-700"
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
      >
        <Search className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="ml-auto hidden md:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[10vh]">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
            {/* Search Input */}
            <div className="flex items-center border-b px-4">
              <Search className="h-5 w-5 text-gray-400" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar propostas, clientes, jobs..."
                className="border-0 focus-visible:ring-0 text-lg py-6"
              />
              {loading && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="ml-2"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {!query && (
                <div className="text-center py-8 text-gray-500">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Digite para buscar em propostas, clientes e jobs</p>
                </div>
              )}

              {query.length >= 2 && !loading && !hasResults && (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhum resultado encontrado para "{query}"</p>
                </div>
              )}

              {hasResults && (
                <div className="space-y-4">
                  {/* Propostas */}
                  {results.proposals.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-gray-500 uppercase">
                        <FileText className="h-4 w-4" />
                        Propostas
                      </div>
                      {results.proposals.map((proposal) => (
                        <button
                          key={proposal.id}
                          onClick={() => handleSelect('proposal', proposal.id)}
                          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
                        >
                          <div>
                            <p className="font-medium">
                              {proposal.proposalCode || proposal.proposalNumber}
                              {proposal.demandName && ` - ${proposal.demandName}`}
                            </p>
                            <p className="text-sm text-gray-500">{proposal.clientName}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#f88910]">
                              R$ {proposal.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <Badge className={cn('text-xs', statusColors[proposal.status] || 'bg-gray-100')}>
                              {proposal.status}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Clientes */}
                  {results.clients.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-gray-500 uppercase">
                        <Users className="h-4 w-4" />
                        Clientes CRM
                      </div>
                      {results.clients.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => handleSelect('client', client.id)}
                          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
                        >
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-sm text-gray-500">
                              {client.company || client.email}
                            </p>
                          </div>
                          <Badge className={cn('text-xs', statusColors[client.status] || 'bg-gray-100')}>
                            {client.status}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Jobs */}
                  {results.jobs.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-gray-500 uppercase">
                        <Palette className="h-4 w-4" />
                        Jobs Criativos
                      </div>
                      {results.jobs.map((job) => (
                        <button
                          key={job.id}
                          onClick={() => handleSelect('job', job.id)}
                          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
                        >
                          <div>
                            <p className="font-medium">{job.jobNumber} - {job.title}</p>
                            <p className="text-sm text-gray-500">{job.clientName}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {job.deadline && (
                              <span className="text-xs text-gray-400">
                                {format(new Date(job.deadline), 'dd/MM', { locale: ptBR })}
                              </span>
                            )}
                            <Badge className={cn('text-xs', statusColors[job.status] || 'bg-gray-100')}>
                              {job.status}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-gray-500">
              <span>Pressione <kbd className="px-1 py-0.5 bg-gray-100 rounded">↵</kbd> para selecionar</span>
              <span>Pressione <kbd className="px-1 py-0.5 bg-gray-100 rounded">ESC</kbd> para fechar</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
