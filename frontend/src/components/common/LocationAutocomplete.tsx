"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { AutoComplete, Spin, message } from "antd";
import type { AutoCompleteProps } from "antd";
import debounce from "lodash/debounce";

interface LocationAutocompleteProps extends Omit<AutoCompleteProps, 'onChange' | 'onSelect'> {
  value?: string;
  onChange?: (value: string) => void;
  onSelect?: (value: string, option: any) => void;
  placeholder?: string;
}

export const LocationAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder,
  ...props
}: LocationAutocompleteProps) => {
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [fetching, setFetching] = useState(false);
  
  // Use a ref to track the last fetch ID to avoid race conditions
  const fetchIdRef = useRef(0);

  const fetchLocations = useMemo(
    () =>
      debounce(async (searchValue: string) => {
        if (!searchValue || searchValue.length < 3) {
          setOptions([]);
          return;
        }

        const fetchId = ++fetchIdRef.current;
        setFetching(true);
        setOptions([]);

        try {
          const response = await fetch(
            `/api/v1/utils/location-autocomplete?query=${encodeURIComponent(searchValue)}`,
            {
                credentials: "include",
            }
          );
          
          if (fetchId !== fetchIdRef.current) {
            // New request started, ignore this one
            return;
          }

          if (response.ok) {
            const data = await response.json();
            const addresses = data.addresses || [];
            
            const newOptions = addresses.map((addr: any) => ({
              value: addr.formattedAddress,
              label: addr.formattedAddress,
              // Store raw data if needed
              raw: addr,
            }));
            
            setOptions(newOptions);
          }
        } catch (error) {
          console.error("Location fetch error:", error);
        } finally {
          if (fetchId === fetchIdRef.current) {
            setFetching(false);
          }
        }
      }, 500),
    []
  );

  useEffect(() => {
    return () => {
      fetchLocations.cancel();
    };
  }, [fetchLocations]);

  return (
    <AutoComplete
      {...props}
      value={value}
      options={options}
      onSearch={fetchLocations}
      onChange={onChange}
      onSelect={onSelect}
      placeholder={placeholder || "Search location (e.g. Ilala, Dar es Salaam)"}
      notFoundContent={fetching ? <Spin size="small" /> : null}
      style={{ width: "100%" }}
    />
  );
};