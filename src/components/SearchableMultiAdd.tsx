import { useState } from 'react';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface SearchableMultiAddProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyHint?: string;
}

export const SearchableMultiAdd = ({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Procurar ou adicionar outro...',
  emptyHint = 'Nenhum resultado.',
}: SearchableMultiAddProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = options.filter(
    (opt) =>
      opt.toLowerCase() !== 'outro' &&
      opt.toLowerCase().includes(search.toLowerCase())
  );

  const trimmedSearch = search.trim();
  const canAddCustom =
    trimmedSearch.length > 0 &&
    !options.some((o) => o.toLowerCase() === trimmedSearch.toLowerCase()) &&
    !value.some((v) => v.toLowerCase() === trimmedSearch.toLowerCase());

  const toggle = (item: string) => {
    if (value.includes(item)) {
      onChange(value.filter((v) => v !== item));
    } else {
      onChange([...value, item]);
    }
    setSearch('');
  };

  const addCustom = () => {
    if (!canAddCustom) return;
    onChange([...value, trimmedSearch]);
    setSearch('');
  };

  const remove = (item: string) => {
    onChange(value.filter((v) => v !== item));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="text-muted-foreground">{placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canAddCustom) {
                  e.preventDefault();
                  addCustom();
                }
              }}
            />
            <CommandList>
              {filtered.length === 0 && !canAddCustom && (
                <CommandEmpty>{emptyHint}</CommandEmpty>
              )}
              {filtered.length > 0 && (
                <CommandGroup>
                  {filtered.map((opt) => {
                    const selected = value.includes(opt);
                    return (
                      <CommandItem
                        key={opt}
                        value={opt}
                        onSelect={() => toggle(opt)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selected ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {opt}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
              {canAddCustom && (
                <CommandGroup heading="Adicionar novo">
                  <CommandItem onSelect={addCustom} value={`__add_${trimmedSearch}`}>
                    <Plus className="mr-2 h-4 w-4 text-primary" />
                    Adicionar "{trimmedSearch}"
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((item) => (
            <Badge key={item} variant="secondary" className="gap-1">
              {item}
              <button
                type="button"
                onClick={() => remove(item)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
