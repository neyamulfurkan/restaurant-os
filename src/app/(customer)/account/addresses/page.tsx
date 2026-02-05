// src/app/(customer)/account/addresses/page.tsx

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Edit2, MapPin, Plus, Star } from 'lucide-react';

interface Address {
  id: string;
  label: string | null;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([
    {
      id: '1',
      label: 'Home',
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      isDefault: true,
    },
    {
      id: '2',
      label: 'Work',
      street: '456 Office Blvd',
      city: 'New York',
      state: 'NY',
      zipCode: '10002',
      country: 'USA',
      isDefault: false,
    },
  ]);

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setFormData({
      label: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
    });
  };

  const handleEdit = (address: Address) => {
    setEditingId(address.id);
    setIsAddingNew(false);
    setFormData({
      label: address.label || '',
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
    });
  };

  const handleSave = () => {
    if (editingId) {
      // Update existing address
      setAddresses((prev) =>
        prev.map((addr) =>
          addr.id === editingId
            ? { ...addr, ...formData, label: formData.label || null }
            : addr
        )
      );
      setEditingId(null);
    } else {
      // Add new address
      const newAddress: Address = {
        id: Date.now().toString(),
        ...formData,
        label: formData.label || null,
        isDefault: addresses.length === 0,
      };
      setAddresses((prev) => [...prev, newAddress]);
      setIsAddingNew(false);
    }

    // Reset form
    setFormData({
      label: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
    });
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setFormData({
      label: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this address?')) {
      setAddresses((prev) => prev.filter((addr) => addr.id !== id));
    }
  };

  const handleSetDefault = (id: string) => {
    setAddresses((prev) =>
      prev.map((addr) => ({
        ...addr,
        isDefault: addr.id === id,
      }))
    );
  };

  const isFormValid =
    formData.street &&
    formData.city &&
    formData.state &&
    formData.zipCode &&
    formData.country;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Saved Addresses</h1>
          <p className="mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Manage your delivery addresses
          </p>
        </div>
        <Button
          onClick={handleAddNew}
          disabled={isAddingNew || editingId !== null}
          className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Address
        </Button>
      </div>

      {/* Add/Edit Form */}
      {(isAddingNew || editingId) && (
        <Card className="rounded-2xl shadow-md bg-card border-border">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">
              {editingId ? 'Edit Address' : 'Add New Address'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Label (Optional)
                </label>
                <Input
                  type="text"
                  name="label"
                  value={formData.label}
                  onChange={handleInputChange}
                  placeholder="e.g., Home, Work, etc."
                  className="w-full px-4 py-3 border-2 border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 rounded-lg transition-colors duration-200 placeholder:text-neutral-400"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Street Address <span className="text-error-500">*</span>
                </label>
                <Input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleInputChange}
                  placeholder="123 Main Street"
                  className="w-full px-4 py-3 border-2 border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 rounded-lg transition-colors duration-200 placeholder:text-neutral-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  City <span className="text-error-500">*</span>
                </label>
                <Input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="New York"
                  className="w-full px-4 py-3 border-2 border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 rounded-lg transition-colors duration-200 placeholder:text-neutral-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  State <span className="text-error-500">*</span>
                </label>
                <Input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  placeholder="NY"
                  className="w-full px-4 py-3 border-2 border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 rounded-lg transition-colors duration-200 placeholder:text-neutral-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  ZIP Code <span className="text-error-500">*</span>
                </label>
                <Input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  placeholder="10001"
                  className="w-full px-4 py-3 border-2 border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 rounded-lg transition-colors duration-200 placeholder:text-neutral-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Country <span className="text-error-500">*</span>
                </label>
                <Input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  placeholder="USA"
                  className="w-full px-4 py-3 border-2 border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 rounded-lg transition-colors duration-200 placeholder:text-neutral-400"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-6 pt-0 flex gap-3">
            <Button
              onClick={handleSave}
              disabled={!isFormValid}
              className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingId ? 'Save Changes' : 'Add Address'}
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              className="border-2 border-neutral-300 text-neutral-600 hover:bg-neutral-50 font-semibold px-6 py-3 rounded-lg transition-all duration-200"
            >
              Cancel
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Addresses List */}
      {addresses.length === 0 ? (
        <Card className="rounded-2xl shadow-md bg-card border-border">
          <CardContent className="p-12 text-center">
            <MapPin className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-neutral-700 mb-2">
              No Addresses Saved
            </h3>
            <p className="text-neutral-500 mb-6">
              Add a delivery address to get started
            </p>
            <Button
              onClick={handleAddNew}
              className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Address
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((address) => (
            <Card
              key={address.id}
              className={`rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 border ${
                address.isDefault
                  ? 'border-primary-500 ring-2 ring-primary-200'
                  : 'border-neutral-100'
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary-500" />
                    {address.label && (
                      <span className="font-semibold text-lg">
                        {address.label}
                      </span>
                    )}
                  </div>
                  {address.isDefault && (
                    <div className="flex items-center gap-1 bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-semibold">
                      <Star className="w-3 h-3 fill-current" />
                      Default
                    </div>
                  )}
                </div>

                <div className="space-y-1 text-neutral-600">
                  <p>{address.street}</p>
                  <p>
                    {address.city}, {address.state} {address.zipCode}
                  </p>
                  <p>{address.country}</p>
                </div>
              </CardContent>

              <CardFooter className="p-6 pt-0 flex gap-2">
                {!address.isDefault && (
                  <Button
                    onClick={() => handleSetDefault(address.id)}
                    variant="outline"
                    size="sm"
                    className="border-2 border-primary-500 text-primary-600 hover:bg-primary-50 font-medium rounded-md transition-colors duration-200"
                  >
                    Set as Default
                  </Button>
                )}
                <Button
                  onClick={() => handleEdit(address)}
                  variant="ghost"
                  size="sm"
                  disabled={editingId !== null || isAddingNew}
                  className="text-neutral-600 hover:text-primary-600 hover:bg-neutral-100 font-medium rounded-md transition-colors duration-200"
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  onClick={() => handleDelete(address.id)}
                  variant="ghost"
                  size="sm"
                  disabled={editingId !== null || isAddingNew}
                  className="text-neutral-600 hover:text-error-600 hover:bg-error-50 font-medium rounded-md transition-colors duration-200"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}