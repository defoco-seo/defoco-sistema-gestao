"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Search, Plus, Minus, Trash2, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Service {
  id: string;
  title: string;
  description: string;
  price: string;
}

interface SelectedService {
  serviceId: string;
  quantity: number;
  customPrice?: number;
}

interface ServiceSelectorProps {
  services: Service[];
  selectedServices: SelectedService[];
  setSelectedServices: (services: SelectedService[]) => void;
}

export function ServiceSelector({
  services,
  selectedServices,
  setSelectedServices,
}: ServiceSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredServices = services?.filter((service) => {
    const search = searchTerm?.toLowerCase() ?? '';
    const title = service?.title?.toLowerCase() ?? '';
    const description = service?.description?.toLowerCase() ?? '';
    return title.includes(search) || description.includes(search);
  }) ?? [];

  const isServiceSelected = (serviceId: string) => {
    return selectedServices?.some((s) => s?.serviceId === serviceId) ?? false;
  };

  const getSelectedService = (serviceId: string) => {
    return selectedServices?.find((s) => s?.serviceId === serviceId);
  };

  const toggleService = (serviceId: string) => {
    if (isServiceSelected(serviceId)) {
      setSelectedServices(
        selectedServices?.filter((s) => s?.serviceId !== serviceId) ?? []
      );
    } else {
      setSelectedServices([
        ...(selectedServices ?? []),
        { serviceId, quantity: 1 },
      ]);
    }
  };

  const updateQuantity = (serviceId: string, quantity: number) => {
    setSelectedServices(
      selectedServices?.map((s) =>
        s?.serviceId === serviceId ? { ...s, quantity: Math.max(1, quantity) } : s
      ) ?? []
    );
  };

  const updateCustomPrice = (serviceId: string, price: number | undefined) => {
    setSelectedServices(
      selectedServices?.map((s) =>
        s?.serviceId === serviceId ? { ...s, customPrice: price } : s
      ) ?? []
    );
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  };

  const getServiceById = (serviceId: string) => {
    return services?.find((s) => s?.id === serviceId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Seleção de Serviços
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar serviços..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Selected Services Summary */}
        {selectedServices && selectedServices.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                Serviços Selecionados ({selectedServices.length})
              </h3>
            </div>
            <div className="space-y-2">
              {selectedServices.map((selectedService) => {
                const service = getServiceById(selectedService?.serviceId);
                if (!service) return null;

                const price = selectedService?.customPrice ?? parseFloat(service?.price ?? '0');
                const total = price * (selectedService?.quantity ?? 1);

                return (
                  <div
                    key={selectedService?.serviceId}
                    className="bg-white rounded-lg p-3 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{service?.title}</h4>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleService(selectedService?.serviceId)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-gray-600">Quantidade</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateQuantity(
                                selectedService?.serviceId,
                                (selectedService?.quantity ?? 1) - 1
                              )
                            }
                            disabled={(selectedService?.quantity ?? 1) <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-semibold">
                            {selectedService?.quantity ?? 1}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateQuantity(
                                selectedService?.serviceId,
                                (selectedService?.quantity ?? 1) + 1
                              )
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-gray-600">Preço Unitário</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={selectedService?.customPrice ?? ''}
                          onChange={(e) =>
                            updateCustomPrice(
                              selectedService?.serviceId,
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          placeholder={formatCurrency(service?.price)}
                          className="mt-1 h-9"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-gray-600">Total</Label>
                        <div className="mt-1 h-9 flex items-center">
                          <span className="font-semibold text-[#f88910]">
                            {formatCurrency(total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Services List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredServices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum serviço encontrado</p>
            </div>
          ) : (
            filteredServices.map((service) => {
              const selected = isServiceSelected(service?.id);
              return (
                <div
                  key={service?.id}
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                    selected ? 'bg-orange-50 border-[#f88910]' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => toggleService(service?.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-gray-900">{service?.title}</h4>
                        <Badge variant="secondary">
                          {formatCurrency(service?.price)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {service?.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}