import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, X } from 'lucide-react';

interface SearchFiltersBarProps {
  from: string;
  to: string;
  userQuery: string;
  userOptions: Array<{ id: number; email: string }>;
  userId: string;
  limit: number;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onUserQueryChange: (value: string) => void;
  onUserSelect: (id: string, email: string) => void;
  onClearUser: () => void;
  onLimitChange: (value: number) => void;
  onExportCsv?: () => void;
}

const SearchFiltersBar: React.FC<SearchFiltersBarProps> = ({
  from, to, userQuery, userOptions, userId, limit,
  onFromChange, onToChange, onUserQueryChange, onUserSelect, onClearUser, onLimitChange, onExportCsv,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Input
        type="date"
        className="w-36 h-8 bg-white border-cream-300"
        value={from ? from.substring(0, 10) : ''}
        onChange={(e) => onFromChange(e.target.value ? `${e.target.value}T00:00:00` : '')}
      />
      <Input
        type="date"
        className="w-36 h-8 bg-white border-cream-300"
        value={to ? to.substring(0, 10) : ''}
        onChange={(e) => onToChange(e.target.value ? `${e.target.value}T23:59:59` : '')}
      />
      <div className="relative">
        <Input
          type="text"
          placeholder="Email utilisateur"
          className="w-56 h-8 bg-white border-cream-300"
          value={userQuery}
          onChange={(e) => onUserQueryChange(e.target.value)}
        />
        {userOptions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-cream-300 rounded-md shadow-lg">
            {userOptions.map((u) => (
              <div
                key={u.id}
                className="px-3 py-1.5 hover:bg-cream-50 cursor-pointer text-sm"
                onClick={() => onUserSelect(String(u.id), u.email)}
              >
                {u.email} <span className="text-xs text-steel">(#{u.id})</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {userId && (
        <Button variant="outline" size="sm" className="h-8 bg-transparent border-cream-300" onClick={onClearUser}>
          <X className="h-3 w-3 mr-1" /> Effacer
        </Button>
      )}
      <Select value={String(limit)} onValueChange={(v) => onLimitChange(parseInt(v, 10))}>
        <SelectTrigger className="w-20 h-8 bg-white border-cream-300">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[25, 50, 100, 150, 200].map((n) => (
            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {onExportCsv && (
        <Button variant="outline" size="sm" className="h-8 bg-transparent border-cream-300" onClick={onExportCsv}>
          <Download className="h-3 w-3 mr-1" /> CSV
        </Button>
      )}
    </div>
  );
};

export default SearchFiltersBar;
