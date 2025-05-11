import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Loader2 } from "lucide-react";

interface Country {
  code: string;
  name: string;
}

interface CountrySelectProps {
  id: string;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const CountrySelect = ({ id, value, onChange, disabled, placeholder = "Select country" }: CountrySelectProps) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2");
        const data = await response.json();
        const formatted = data
          .map((country: any) => ({
            code: country.cca2.toLowerCase(),
            name: country.name.common,
          }))
          .sort((a: Country, b: Country) => a.name.localeCompare(b.name));
        setCountries(formatted);
      } catch (error) {
        setCountries([
          { code: "us", name: "United States" },
          { code: "gb", name: "United Kingdom" },
          { code: "ca", name: "Canada" },
          { code: "au", name: "Australia" },
          { code: "de", name: "Germany" },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCountries();
  }, []);

  return (
    <Select
      onValueChange={onChange}
      defaultValue={value}
      disabled={disabled || loading}
    >
      <SelectTrigger id={id}>
        {loading ? (
          <div className="flex items-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>Loading...</span>
          </div>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent>
        {countries.map((country) => (
          <SelectItem key={country.code} value={country.name}>
            {country.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CountrySelect;
